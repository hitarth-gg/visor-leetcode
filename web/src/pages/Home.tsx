export default function Home() {
  return (
    <main className="bg-background flex h-screen flex-col items-center justify-center">
      <div className="flex h-full w-full flex-col items-center gap-4 border px-6 py-16">
        <div className="font-geist text-primary flex flex-col items-center text-3xl font-semibold sm:text-4xl md:text-5xl">
          <span>Company-Wise</span>
          <span>
            <span className="bg-linear-to-b from-[#ffa116] via-[#ff9345] to-[#ff3d00] bg-clip-text text-transparent">
              Leetcode{" "}
            </span>
            Problems
          </span>
        </div>
      </div>
    </main>
  );
}
