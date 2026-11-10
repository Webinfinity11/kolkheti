// The site's content as it was hard-coded in the HTML before the admin panel.
// Served until the first save from /admin, and used to fill any missing field.
export const DEFAULTS = {
  contact: { email: "info@kolkheti.ge" },
  home: {
    signupTitle: "Next Exhibition",
    signupLead:
      "Leave your email and we will let you know when the next Maison Colchia exhibition opens.",
  },
  artists: {
    tag: "Collection",
    title: "Artists",
    intro:
      "Six authors whose work belongs to the MAISON KOLKHETI collection. Each of them reads the myth of Colchis in their own language.",
    meta: [
      { value: "06", label: "Artists" },
      { value: "2018—2025", label: "Period" },
      { value: "Tbilisi", label: "On view" },
    ],
    closingTitle: "Interested in a work?",
    closingText:
      "Write to us for availability and prices — part of the collection is on permanent view.",
    items: [
      {
        name: "Nino Beridze",
        medium: "Oil on canvas · 2019—2024",
        note: "Large-format landscapes in which the Colchian marshland turns to golden haze. Colour goes on in layers — a single canvas can take her the better part of a year.",
        image: "",
        a: "#1d1610",
        b: "#3b2b18",
      },
      {
        name: "Levan Kavtaradze",
        medium: "Mixed media · 2021—2025",
        note: 'Metal leaf and pigment worked together on canvas. His series "Argonauts" turns the reflection on the sea into a physical surface.',
        image: "",
        a: "#141a1d",
        b: "#2f3b43",
      },
      {
        name: "Ana Mikeladze",
        medium: "Watercolour on paper · 2022—2025",
        note: "Small formats, closer to diary entries than to pictures. She returns to one motif again and again until the form comes apart.",
        image: "",
        a: "#1f140c",
        b: "#43291b",
      },
      {
        name: "Giorgi Lomidze",
        medium: "Acrylic on wood · 2020—2024",
        note: "He works on salvaged doors and boards — the material is part of the piece. The splits in the wood stay on as lines in the composition.",
        image: "",
        a: "#15151d",
        b: "#2d2c46",
      },
      {
        name: "Tamar Chkheidze",
        medium: "Tempera on paper · 2018—2023",
        note: "She carries the technique of icon painting into contemporary portraiture. For her the gold ground is a historical quotation, not decoration.",
        image: "",
        a: "#1b1914",
        b: "#3e3827",
      },
      {
        name: "Davit Nadiradze",
        medium: "Charcoal on canvas · 2023—2025",
        note: 'The monochrome series "Birth of the Universe". He takes light out of darkness — the canvas is blacked out first, then the form is cleared back into it.',
        image: "",
        a: "#101314",
        b: "#27353b",
      },
    ],
  },
  jewelry: {
    tag: "Collection",
    title: "Jewelry",
    intro:
      "Two collections, one source — Colchian goldsmithing. Every piece is finished by hand in the Tbilisi workshop.",
    meta: [
      { value: "02", label: "Collections" },
      { value: "14K / 925", label: "Metal" },
      { value: "By hand", label: "Made" },
    ],
    closingTitle: "Commission a piece",
    closingText:
      "Pieces are available at the workshop and to order. Write to us for prices and lead times.",
    items: [
      {
        name: "The Golden Fleece",
        medium: "14K gold · Hand-forged",
        note: "At the centre of the collection is the scale motif of the fleece — every element is forged separately and set by hand. Earrings, medallions and bracelets, each piece numbered.",
        image: "",
        a: "#231a0d",
        b: "#5b441a",
      },
      {
        name: "Constellation in Silver",
        medium: "925 silver, white stones · Limited",
        note: "The map of Georgia drawn in stars — the same motif that opens the site. Necklaces and rings in which every stone marks one city.",
        image: "",
        a: "#14191c",
        b: "#394850",
      },
    ],
  },
};
