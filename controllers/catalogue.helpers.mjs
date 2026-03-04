import { supabase } from "../db/supabase.mjs";

// Simple keyword → category mapping.
// This is NOT an ingredient list; it’s category inference for unknown names.
const CATEGORY_CONTAINS_RULES = [
  { id: 9,  words: ["bread","bagel","bun","buns","roll","wrap","pita","naan","croissant","sourdough","brioche","ciabatta","baguette","muffin","toast"] },
  { id: 7,  words: ["milk","cheese","yogurt","butter","cream","mozzarella","cheddar","parmesan","ricotta","feta","custard"] },
  { id: 8,  words: ["egg","eggs","omelette"] },
  { id: 10, words: ["rice","pasta","spaghetti","noodle","noodles","quinoa","oats","barley","couscous","bulgur","semolina"] },
  { id: 16, words: ["ketchup","mayonnaise","mustard","soy","sauce","bbq","hot sauce","salsa","pesto","gravy","curry sauce"] },
  { id: 17, words: ["oil","olive oil","sunflower","rapeseed","vegetable oil","vinegar","balsamic"] },
  { id: 11, words: ["canned","tinned","tin","jar","jarred","beans","chickpeas","lentils","sweetcorn"] },
  { id: 12, words: ["frozen"] },
  { id: 6,  words: ["salmon","tuna","cod","haddock","prawn","prawns","shrimp","crab","lobster","mussel","mussels","scallop","scallops","sardine","sardines"] },
  { id: 5,  words: ["chicken","turkey","duck"] },
  { id: 4,  words: ["beef","pork","bacon","ham","lamb","veal","steak","sausage"] },
  { id: 3,  words: ["basil","parsley","coriander","cilantro","mint","oregano","thyme","rosemary","dill","chives","cumin","paprika","turmeric","cinnamon","nutmeg","cloves","ginger"] },
  { id: 2,  words: ["tomato","cucumber","lettuce","carrot","onion","garlic","pepper","potato","broccoli","spinach","mushroom","courgette","zucchini","cabbage","kale","cauliflower","peas","corn"] },
  { id: 1,  words: ["apple","banana","orange","grape","strawberry","blueberry","raspberry","mango","pineapple","kiwi","peach","plum","cherry","watermelon","lemon","lime","pear"] },
];

function normalizeName(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function inferCategoryIdFromName(name) {
  const n = normalizeName(name);
  if (!n) return 22;

  for (const rule of CATEGORY_CONTAINS_RULES) {
    for (const w of rule.words) {
      if (n.includes(w)) return rule.id;
    }
  }
  return 22;
}

/**
 * Find/Match/Create catalogue item:
 * 1) exact-ish match by ilike
 * 2) "contains" matching (detected string contains catalogue name OR keyword match)
 * 3) create with inferred category or defaultCategoryID (usually 22)
 */
export async function findOrCreateCatalogueItemByName(name, defaultCategoryID = 22) {
  const clean = String(name || "").trim();
  if (!clean) throw new Error("name is required");

  const norm = normalizeName(clean);

  // 1) Exact-ish match
  const { data: exact, error: exactErr } = await supabase
    .from("CatalogueTBL")
    .select("CatalogueID, name, CategoryID, tags")
    .ilike("name", clean)
    .limit(1);

  if (exactErr) throw exactErr;
  if (exact?.length) return exact[0];

  // 2) Contains matching:
  // Try last word as a search hint (e.g. "bread", "milk")
  const lastWord = norm.split(" ").slice(-1)[0];
  if (lastWord) {
    const { data: candidates, error: candErr } = await supabase
      .from("CatalogueTBL")
      .select("CatalogueID, name, CategoryID, tags")
      .ilike("name", `%${lastWord}%`)
      .limit(50);

    if (candErr) throw candErr;

    if (candidates?.length) {
      // pick the longest catalogue name contained inside the detected string
      const match = candidates
        .filter((c) => norm.includes(normalizeName(c.name)))
        .sort((a, b) => normalizeName(b.name).length - normalizeName(a.name).length)[0];

      if (match) return match;
    }
  }

  // 3) Create new catalogue item with inferred category
  const inferredCategoryID = inferCategoryIdFromName(clean) || defaultCategoryID;

  const { data: created, error: createErr } = await supabase
    .from("CatalogueTBL")
    .insert([{ name: clean, CategoryID: inferredCategoryID, tags: [] }])
    .select("CatalogueID, name, CategoryID, tags")
    .single();

  if (createErr) throw createErr;
  return created;
}