// prettier-ignore

// 1. Explicitly map known brands to their accurate colors to save bundle size
const specificColors: Record<string, string[]> = {
  // --- Gradients ---
"bg-gradient-to-r from-blue-600 via-red-500 to-yellow-500 text-transparent bg-clip-text": ["google", "zoho", "ebay"],
"bg-gradient-to-r from-orange-600 via-green-500 to-blue-600 text-transparent bg-clip-text": ["microsoft", "slack"],
"bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 text-transparent bg-clip-text": ["instagram", "canva", "figma"],
"bg-gradient-to-r from-cyan-600 via-slate-500 to-pink-500 text-transparent bg-clip-text": ["tiktok", "bytedance"],

  // --- Solid Brand Colors ---
  "text-red-600 dark:text-red-500": [
    "adobe", "airtel", "bnp-paribas", "broadcom", "doordash", "dream11", "fortinet", "hsbc", "huawei",
    "lg-electronics", "makemytrip", "mcafee", "netflix", "oracle", "oyo", "pinterest", "quora", "redbus",
    "reddit", "riot-games", "target", "tesla", "wells-fargo", "yelp", "zomato", "zynga", "activision",
    "careem", "citi", "cleartrip", "databricks", "jio", "kotak-mahindra-bank", "mcdonalds", "nintendo",
    "peloton", "reliance", "societe-generale", "toyota", "traveloka", "virgin", "vodafone", "yatra", "coca-cola"
  ],
  "text-orange-600 dark:text-orange-400": [
    "amazon", "alibaba", "blinkit", "cloudflare", "gojek", "mastercard", "postman", "swiggy",
    "shopee", "yandex", "agoda", "aws", "chegg", "discover", "etsy", "flipkart", "godaddy",
    "hubspot", "imdb", "ing", "kayak", "mozilla", "navi", "orange", "pwc", "sprint", "strava", "ubuntu"
  ],
  "text-green-600 dark:text-green-400": [
    "acer", "bp", "grab", "groupon", "hulu", "instacart", "nvidia", "robinhood", "shopify", "spotify",
    "whatsapp", "zepto", "bcg", "cashfree", "cvent", "deloitte", "dunzo", "duolingo", "evernote", "fiverr",
    "ge-healthcare", "glassdoor", "hellofresh", "hpe", "lime", "mongodb", "ola", "palantir", "pubmatic",
    "razer", "schneider-electric", "servicenow", "starbucks", "subway", "tripadvisor", "upwork", "veeva"
  ],
  "text-sky-500 dark:text-sky-400": [
    "twitter", "vimeo", "skype", "snowflake", "dropbox", "cloudera", "palo-alto-networks", "appdynamics",
    "docker", "epic-systems", "freshworks", "gartner", "hashicorp", "intercom", "mixpanel", "netapp",
    "netsuite", "okta", "splunk", "squarespace", "twilio", "uipath", "zendesk", "zscaler", "zoom", "paytm"
  ],
  "text-indigo-600 dark:text-indigo-400": [
    "discord", "twitch", "yahoo", "stripe", "accenture", "github", "gitlab", "heroku", "kraken",
    "tcs", "wayfair", "zillow", "mindtree", "lti", "epam-systems", "wipro", "infosys", "cognizant"
  ],
  "text-rose-600 dark:text-rose-400": [
    "airbnb", "lyft", "nykaa", "dribbble", "poshmark", "foodpanda", "meesho", "purplle", "tinder"
  ],
  "text-slate-800 dark:text-slate-200": [
    "apple", "uber", "x", "notion", "square", "block", "palantir-technologies", "roblox", "epic-games",
    "unity", "valve", "adidas", "bbc", "bmw", "cbs", "cnn", "disney", "ea", "honda", "ibm", "intel",
    "nike", "panasonic", "samsung", "sony", "wework", "wikipedia", "zara", "blackrock"
  ]
};

// 2. Beautiful corporate fallback colors for all the remaining 500+ companies
const fallbackColors = [
  "text-blue-600 dark:text-blue-400",
  "text-indigo-600 dark:text-indigo-400",
  "text-sky-600 dark:text-sky-400",
  "text-violet-600 dark:text-violet-400",
  "text-cyan-600 dark:text-cyan-400",
  "text-slate-700 dark:text-slate-300",
];

// 3. Pre-compute the flat map for fast O(1) lookups
const companyMap = new Map<string, string>();
Object.entries(specificColors).forEach(([colorClass, companies]) => {
  companies.forEach((company) => {
    companyMap.set(company.toLowerCase(), colorClass);
  });
});

// 4. The main retrieval function
export const getCompanyColor = (name: string) => {
  const normalizedName = name.toLowerCase().trim();

  // Check if it's explicitly mapped
  if (companyMap.has(normalizedName)) {
    return companyMap.get(normalizedName) + " font-semibold";
  }

  // Deterministic fallback: Assign a consistent color based on string character codes
  let hash = 0;
  for (let i = 0; i < normalizedName.length; i++) {
    hash += normalizedName.charCodeAt(i);
  }

  const fallbackColor = fallbackColors[hash % fallbackColors.length];
  return fallbackColor + " font-medium"; // Slightly less bold for standard fallback companies
};
