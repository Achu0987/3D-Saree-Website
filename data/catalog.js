// ✏️ Store copy + catalogue. Swap the demo photos for your own product shots before launch.
// Photos: Unsplash (free licence) — credited per item and in the footer.
// Prefix for files in /public — empty locally, "/3D-Saree-Website" on GitHub Pages (set at build time).
export const asset = (p) => `${process.env.NEXT_PUBLIC_BASE_PATH || ""}${p}`;

export const store = {
  name: "Harsha",
  tagline: "Handwoven sarees, draped in light",
  email: "hello@harsha.example",
  currency: "₹",
};

export const sarees = [
  { id: "teal", name: "Peacock Teal Kanjivaram", weave: "Kanjivaram silk", region: "Kanchipuram", price: 1450, colors: ["#2f7d7b", "#c9a24a"], note: "Pure mulberry silk with a temple-motif zari body.", credit: { by: "Sabesh Photography LTD", url: "https://unsplash.com/photos/njVir8eVq1M" } },
  { id: "sindoor", name: "Sindoor Red Banarasi", weave: "Banarasi katan silk", region: "Varanasi", price: 1399, colors: ["#c8161d", "#d4a64a"], note: "The bridal red, with a broad kadhua-woven gold pallu.", credit: { by: "inesh thamotharampillai", url: "https://unsplash.com/photos/6XZWrSBo5o4" } },
  { id: "golden", name: "Golden Hour Kanjivaram", weave: "Kanjivaram tissue silk", region: "Kanchipuram", price: 1499, colors: ["#c08a5a", "#e3c27a"], note: "Rose-gold tissue that glows like late sun.", credit: { by: "shades by 43", url: "https://unsplash.com/photos/Rm9DL9DmGi4" } },
  { id: "rani", name: "Rani Pink Silk", weave: "Soft silk", region: "Arani", price: 1199, colors: ["#d81e5b", "#e2b34a"], note: "Rani pink with a contrast mango-yellow border.", credit: { by: "Sabesh Photography LTD", url: "https://unsplash.com/photos/Xqa_NWl4xEY" } },
  { id: "purple", name: "Royal Purple Kanjivaram", weave: "Kanjivaram silk", region: "Kanchipuram", price: 1475, colors: ["#6b2a8c", "#d9b45a"], note: "Deep violet with all-over gold buttas.", credit: { by: "Bella Pon Fruitsia", url: "https://unsplash.com/photos/wcgCFUi_Zws" } },
  { id: "plum", name: "Midnight Plum Paithani", weave: "Paithani silk", region: "Paithan", price: 1350, colors: ["#3b1f4a", "#c79a3c"], note: "Plum body, peacock-weave gold border.", credit: { by: "Bulbul Ahmed", url: "https://unsplash.com/photos/xTrp1WOq2Do" } },
  { id: "moonlight", name: "Moonlight Tissue Silk", weave: "Tissue silk", region: "Kanchipuram", price: 1250, colors: ["#cfd6cf", "#d8c9a0"], note: "Silver-grey tissue with a whisper of zari.", credit: { by: "Bulbul Ahmed", url: "https://unsplash.com/photos/A7H3qmJTNJc" } },
  { id: "noir", name: "Noir Zari Silk", weave: "Silk with zari stripes", region: "Bengaluru", price: 1299, colors: ["#1b1b1f", "#c8b27a"], note: "Black silk, broad silver-gold zari bands.", credit: { by: "Bulbul Ahmed", url: "https://unsplash.com/photos/SiQTqnp-qd8" } },
  { id: "monsoon", name: "Monsoon Organza", weave: "Printed organza", region: "Surat", price: 1050, colors: ["#3b4fa8", "#e86a4a"], note: "Featherlight organza in rain-washed blues.", credit: { by: "Horitoki Ltd", url: "https://unsplash.com/photos/dCuCMZ9XnHg" } },
  { id: "indigo", name: "Indigo Gold-Border Silk", weave: "Soft silk", region: "Mysuru", price: 1150, colors: ["#25327a", "#d9b24a"], note: "Indigo body, red-and-gold temple border.", credit: { by: "Bulbul Ahmed", url: "https://unsplash.com/photos/v9nCfAKxxx4" } },
  { id: "blush", name: "Blush Pink Soft Silk", weave: "Soft silk", region: "Dharmavaram", price: 1099, colors: ["#f19a9a", "#e3b25a"], note: "Petal pink with a fine gold weave.", credit: { by: "Bulbul Ahmed", url: "https://unsplash.com/photos/vvI7zHZ7vz4" } },
  { id: "pastel", name: "Pastel Bloom Organza", weave: "Hand-painted organza", region: "Jaipur", price: 1125, colors: ["#f4b8c8", "#f6d36b"], note: "Watercolour blooms on sheer organza.", credit: { by: "Dhruv vishwakarma", url: "https://unsplash.com/photos/wgEWSRQuoEE" } },
  { id: "lemon", name: "Lemon Chiffon Jamdani", weave: "Jamdani cotton-silk", region: "Dhaka weave", price: 1000, colors: ["#efe08a", "#7fb6a8"], note: "Sunlit yellow with hand-inlaid jamdani motifs.", credit: { by: "Bulbul Ahmed", url: "https://unsplash.com/photos/YMWRzJiYmgk" } },
];

// Hero drape fabrics: flat-lay scans recreated from the owner's reference saree photos.
// First one is the default.
export const weaves = [
  { id: "redgold", name: "Red Gold Brocade Silk", tex: asset("/textures/silk-red-gold.jpg") },
  { id: "olive", name: "Olive Gold Tissue", tex: asset("/textures/silk-olive.jpg") },
  { id: "green", name: "Parrot Green Kanjivaram", tex: asset("/textures/silk-green.jpg") },
];

// The silk room: a gallery of real saree photographs, framed and hanging from a gold rod
export const silkRoom = [
  { name: "Pink & Gold Banarasi", tex: asset("/gallery/banarasi-closeup.webp") },
  { name: "Peacock Teal Kanjivaram", tex: asset("/gallery/teal.webp") },
  { name: "Golden Hour Kanjivaram", tex: asset("/gallery/golden.webp") },
  { name: "Peach & Maroon Zari Silk", tex: asset("/gallery/zari-closeup.webp") },
  { name: "Royal Purple Kanjivaram", tex: asset("/gallery/purple.webp") },
  { name: "Rani Pink Silk", tex: asset("/gallery/rani.webp") },
  { name: "Lemon Jamdani", tex: asset("/gallery/jamdani-closeup.webp") },
  { name: "Sindoor Red Banarasi", tex: asset("/gallery/sindoor.webp") },
  { name: "Midnight Plum Paithani", tex: asset("/gallery/plum.webp") },
  { name: "Ikat Silk", tex: asset("/gallery/ikat-closeup.webp") },
  { name: "Indigo Gold-Border Silk", tex: asset("/gallery/indigo.webp") },
];

export const imageCredits = [
  { what: "Banarasi close-up", by: "Squade Arrow", url: "https://unsplash.com/photos/bWc885gZXEs" },
  { what: "Zari close-up", by: "Squade Arrow", url: "https://unsplash.com/photos/RpbzwZu4ftg" },
  { what: "Ikat with pearls", by: "Urvi Kotasthane", url: "https://unsplash.com/photos/GRQTCeP0MqU" },
  { what: "Textiles on hangers", by: "Wolfgang Hasselmann", url: "https://unsplash.com/photos/VdgSIq4khdA" },
  { what: "Zari detail", by: "Jainica Dhingra", url: "https://unsplash.com/photos/udCX1mvNFos" },
  { what: "Silk stack", by: "vinay manda", url: "https://unsplash.com/photos/NQ0dtGvTZEQ" },
  { what: "Folded fabrics", by: "Ekaterina Grosheva", url: "https://unsplash.com/photos/Htzlqefo8Rg" },
];

export const formatPrice = (n) => `${store.currency}${n.toLocaleString("en-IN")}`;
