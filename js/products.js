// ===== PRODUCTS DATA =====
const PRODUCTS = [
  {
    id: 1, name: "فستان شيفون وردي", category: "فساتين",
    price: 450, oldPrice: 600,
    image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500&q=80",
    sizes: ["S","M","L","XL","2XL","3XL"], badge: "new",
    colors: ["#FFB6C1","#FF69B4","#fff","#C8A2C8"],
    description: "فستان شيفون خفيف ومريح مناسب لجميع المناسبات"
  },
  {
    id: 2, name: "بلوزة كاجوال ناعمة", category: "بلوزات",
    price: 280, oldPrice: 350,
    image: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=500&q=80",
    sizes: ["S","M","L","XL","2XL"], badge: "sale",
    colors: ["#fff","#000","#FFB6C1","#87CEEB"],
    description: "بلوزة ناعمة كاجوال تناسب كل الأوقات"
  },
  {
    id: 3, name: "بنطلون جينز كلاسيك", category: "بناطيل",
    price: 380, oldPrice: null,
    image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=500&q=80",
    sizes: ["32","34","36","38","40","42","44"], badge: "new",
    colors: ["#4169E1","#000","#808080"],
    description: "جينز كلاسيك عالي الجودة بقصة مريحة"
  },
  {
    id: 4, name: "طقم كاجوال أنيق", category: "أطقم",
    price: 650, oldPrice: 850,
    image: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=500&q=80",
    sizes: ["S","M","L","XL","2XL","3XL","4XL"], badge: "sale",
    colors: ["#E8D5B7","#D2691E","#000","#808080"],
    description: "طقم كامل بيجا أو خروج مريح وأنيق"
  },
  {
    id: 5, name: "تيشيرت بيزيك أوفرسايز", category: "تيشيرتات",
    price: 199, oldPrice: 250,
    image: "https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?w=500&q=80",
    sizes: ["S","M","L","XL","2XL","3XL"], badge: "new",
    colors: ["#fff","#000","#FFB6C1","#90EE90","#FFD700"],
    description: "تيشيرت أوفرسايز مريح للبيت والخروج"
  },
  {
    id: 6, name: "فستان أطفال ملون", category: "أطفال",
    price: 320, oldPrice: 400,
    image: "https://images.unsplash.com/photo-1471286174890-9c112ffca5b4?w=500&q=80",
    sizes: ["2 سنة","4 سنة","6 سنة","8 سنة","10 سنة","12 سنة"], badge: "new",
    colors: ["#FF69B4","#FFD700","#87CEEB","#98FB98"],
    description: "فستان أطفال ناعم وملون للبنات الصغار"
  },
  {
    id: 7, name: "فستان مسائي فاخر", category: "فساتين",
    price: 850, oldPrice: 1100,
    image: "https://images.unsplash.com/photo-1612336307429-8a898d10e223?w=500&q=80",
    sizes: ["S","M","L","XL","2XL"], badge: "new",
    colors: ["#000","#C8A2C8","#FFD700","#FF0000"],
    description: "فستان مسائي فاخر مناسب للأفراح والمناسبات"
  },
  {
    id: 8, name: "بلوزة حرير سادة", category: "بلوزات",
    price: 350, oldPrice: null,
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&q=80",
    sizes: ["S","M","L","XL","2XL","3XL"], badge: null,
    colors: ["#fff","#C0C0C0","#000080","#FFB6C1"],
    description: "بلوزة حرير ناعمة جداً بقصة كلاسيكية"
  },
  {
    id: 9, name: "جيبة بليسيه ميدي", category: "جيبات",
    price: 299, oldPrice: 380,
    image: "https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=500&q=80",
    sizes: ["S","M","L","XL","2XL"], badge: "sale",
    colors: ["#FFB6C1","#000","#87CEEB","#E8D5B7"],
    description: "جيبة بليسيه ميدي تناسب كل الأوقات"
  },
  {
    id: 10, name: "طقم رياضي مريح", category: "أطقم",
    price: 520, oldPrice: 650,
    image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=500&q=80",
    sizes: ["S","M","L","XL","2XL","3XL","4XL","5XL"], badge: "new",
    colors: ["#000","#C0C0C0","#FF69B4","#4169E1"],
    description: "طقم رياضي كامل مريح ومناسب للبيت والجيم"
  },
  {
    id: 11, name: "تيشيرت برينت ترند", category: "تيشيرتات",
    price: 220, oldPrice: 280,
    image: "https://images.unsplash.com/photo-1602810316693-3667c854239a?w=500&q=80",
    sizes: ["XS","S","M","L","XL","2XL","3XL"], badge: "new",
    colors: ["#fff","#F0E68C","#FFB6C1","#98FB98"],
    description: "تيشيرت بريند مودرن بطبعة تريند"
  },
  {
    id: 12, name: "طقم أطفال صيفي", category: "أطفال",
    price: 280, oldPrice: 350,
    image: "https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?w=500&q=80",
    sizes: ["3-4","5-6","7-8","9-10","11-12"], badge: null,
    colors: ["#FFD700","#FF69B4","#87CEEB"],
    description: "طقم صيفي للبنات الصغار خفيف ومريح"
  }
];
