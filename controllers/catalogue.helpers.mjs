import { supabase } from "../db/supabase.mjs";

export async function findOrCreateCatalogueItemByName(name, defaultCategoryID = 22) {
  const clean = String(name || "").trim();
  if (!clean) throw new Error("name is required");

  // try find existing catalogue item (case-insensitive)
  const { data: found, error: findErr } = await supabase
    .from("CatalogueTBL")
    .select('CatalogueID, name, CategoryID, tags')
    .ilike("name", clean)
    .limit(1);

  if (findErr) throw findErr;
  if (found?.length) return found[0];

  // create new catalogue row (uncategorized default)
  const { data: created, error: createErr } = await supabase
    .from("CatalogueTBL")
    .insert([{ name: clean, CategoryID: defaultCategoryID, tags: [] }])
    .select('CatalogueID, name, CategoryID, tags')
    .single();

  if (createErr) throw createErr;
  return created;
}