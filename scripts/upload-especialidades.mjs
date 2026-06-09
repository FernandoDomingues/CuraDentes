import { createClient } from "@supabase/supabase-js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.resolve(__dirname, "assets/especialidades");

const FILES = [
  "clinico-geral.webp",
  "clareamento-dental.webp",
  "lentes-de-contato-dental.webp",
  "ortodontia.webp",
  "implante-dentario.webp",
  "cirurgia-oral.webp",
  "harmonizacao-orofacial.webp",
];

async function upload() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing env vars: VITE_SUPABASE_URL and SUPABASE_SERVICE_KEY are required");
    console.error("Set them or create a .env file in scripts/");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  for (const file of FILES) {
    const filePath = path.join(ASSETS_DIR, file);
    const buffer = await fs.readFile(filePath);

    const { data, error } = await supabase.storage
      .from("especialidades")
      .upload(file, buffer, {
        contentType: "image/webp",
        upsert: true,
        cacheControl: "31536000",
      });

    if (error) {
      console.error(`FAIL ${file}: ${error.message}`);
    } else {
      const publicUrl = supabase.storage.from("especialidades").getPublicUrl(file).data.publicUrl;
      console.log(`OK ${file} → ${publicUrl}`);
    }
  }
}

upload();
