import sharp from "sharp";
import fs from "fs/promises";
import path from "path";

const OUT_DIR = path.resolve("scripts/assets/especialidades");

const IMAGES = [
  {
    url: "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=1600&h=800&fit=crop&auto=format&q=80",
    name: "clinico-geral",
    alt: "Profissional de odontologia realizando atendimento clinico geral em consultorio moderno",
  },
  {
    url: "https://images.unsplash.com/photo-1606811971618-4486d14f3f99?w=1600&h=800&fit=crop&auto=format&q=80",
    name: "clareamento-dental",
    alt: "Paciente feminina sorrindo durante procedimento de clareamento dental em consultorio",
  },
  {
    url: "https://images.unsplash.com/photo-1593022356769-11f762e25ed9?w=1600&h=800&fit=crop&auto=format&q=80",
    name: "lentes-de-contato-dental",
    alt: "Aplicacao de lentes de contato dental e facetas de porcelana em paciente",
  },
  {
    url: "https://images.unsplash.com/photo-1598256989800-fe5f95da9787?w=1600&h=800&fit=crop&auto=format&q=80",
    name: "ortodontia",
    alt: "Paciente com aparelho ortodontoico em tratamento de ortodontia",
  },
  {
    url: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=1600&h=800&fit=crop&auto=format&q=80",
    name: "implante-dentario",
    alt: "Procedimento de implante dentario e protese em consultorio odontologico",
  },
  {
    url: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=1600&h=800&fit=crop&auto=format&q=80",
    name: "cirurgia-oral",
    alt: "Cirurgia odontologica sendo realizada por dentista em ambiente esterilizado",
  },
  {
    url: "https://images.unsplash.com/photo-1612276529731-4b21494e6d71?w=1600&h=800&fit=crop&auto=format&q=80",
    name: "harmonizacao-orofacial",
    alt: "Procedimento de harmonizacao orofacial e botox odontologico com aplicacao precisa",
  },
];

async function process() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  for (const img of IMAGES) {
    const webpPath = path.join(OUT_DIR, `${img.name}.webp`);
    const jsonPath = path.join(OUT_DIR, `${img.name}.json`);

    try {
      const resp = await fetch(img.url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const buffer = Buffer.from(await resp.arrayBuffer());

      const metadata = await sharp(buffer).metadata();

      const webpBuffer = await sharp(buffer)
        .resize(800, 400, { fit: "cover", position: "center" })
        .webp({ quality: 82, effort: 6, nearLossless: false })
        .withMetadata({ exif: {} })
        .toBuffer();

      await fs.writeFile(webpPath, webpBuffer);

      const info = await sharp(webpBuffer).metadata();

      const meta = {
        originalUrl: img.url,
        filename: `${img.name}.webp`,
        alt: img.alt,
        width: info.width,
        height: info.height,
        format: info.format,
        sizeBytes: webpBuffer.length,
        sizeKB: (webpBuffer.length / 1024).toFixed(1),
        originalWidth: metadata.width,
        originalHeight: metadata.height,
        originalFormat: metadata.format,
        convertedAt: new Date().toISOString(),
      };

      await fs.writeFile(jsonPath, JSON.stringify(meta, null, 2));
      console.log(`OK ${img.name}.webp (${meta.sizeKB} KB)`);
    } catch (err) {
      console.error(`FAIL ${img.name}: ${err.message}`);
    }
  }

  console.log("\nDone.");
}

process();
