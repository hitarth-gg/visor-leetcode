// -------- CONFIG --------
const BATCH_SIZE = 10; // safe batch size
const DELAY_MS = 400; // delay between batches
// ------------------------

const slugs = [
  "two-sum",
  "three-sum",
  "add-two-numbers",
  "longest-substring-without-repeating-characters",
  "median-of-two-sorted-arrays",
  "valid-parentheses",
  "merge-two-sorted-lists",
  "best-time-to-buy-and-sell-stock",
  "binary-tree-inorder-traversal",
  "climbing-stairs",
  "maximum-subarray",
  "invert-binary-tree",
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildQuery(batch) {
  let query = "query {";

  batch.forEach((slug, index) => {
    query += `
      q${index}: question(titleSlug: "${slug}") {
        title
        titleSlug
        difficulty
        topicTags {
          name
        }
      }
    `;
  });

  query += "}";
  return query;
}

async function fetchBatch(batch) {
  const query = buildQuery(batch);

  const response = await fetch("https://leetcode.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  const data = await response.json();
  return data.data;
}

async function main() {
  for (let i = 0; i < slugs.length; i += BATCH_SIZE) {
    const batch = slugs.slice(i, i + BATCH_SIZE);

    console.log(`\nFetching batch: ${batch.join(", ")}`);

    try {
      const result = await fetchBatch(batch);

      Object.values(result).forEach((problem) => {
        if (!problem) {
          console.log(
            "⚠ Problem returned null (possibly invalid slug or rate limit)"
          );
          return;
        }

        const tags = problem.topicTags.map((t) => t.name);

        console.log(`\n${problem.title} (${problem.difficulty})`);
        console.log("Tags:", tags.join(", "));
      });
    } catch (err) {
      console.error("Error:", err.message);
    }

    await sleep(DELAY_MS);
  }
}

main();
