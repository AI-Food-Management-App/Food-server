import { supabase } from "../db/supabase.mjs";

export async function resolveCategoryFromCatalogue(inputName, defaultCategoryID = 22) {
  const clean = String(inputName || "").trim();
  if (!clean) throw new Error("name is required");

  // try best match via SQL function (partial + fuzzy)
  const { data, error } = await supabase.rpc("best_catalogue_match", { // added supabase query
    search_text: clean,
  });

  if (error) throw error;

  if (data?.length) {
    return {
      CategoryID: data[0].CategoryID,
      matchedName: data[0].name, // e.g. "Bread"
      CatalogueID: data[0].CatalogueID,
    };
  }

  return { CategoryID: defaultCategoryID, matchedName: null, CatalogueID: null };
}