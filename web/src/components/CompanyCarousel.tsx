import { motion } from "framer-motion";
import {
  siZomato,
  siApple,
  siUber,
  siCoinbase,
  siGithub,
  siCloudflare,
  siRoblox,
  siMeta,
  siVmware,
  siDropbox,
  siExpedia,
  siNetflix,
  siDoordash,
} from "simple-icons";

const logos = [
  <span
    key="zomato"
    className="text-muted-foreground [&>svg]:fill-muted-foreground/50 [&>svg]:w-42"
    dangerouslySetInnerHTML={{ __html: siZomato.svg }}
  />,
  <span
    key="apple"
    className="text-muted-foreground [&>svg]:fill-muted-foreground/50 [&>svg]:w-14"
    dangerouslySetInnerHTML={{ __html: siApple.svg }}
  />,
  <span
    key="uber"
    className="text-muted-foreground [&>svg]:fill-muted-foreground/50 [&>svg]:w-20"
    dangerouslySetInnerHTML={{ __html: siUber.svg }}
  />,
  <span
    key="coinbase"
    className="text-muted-foreground [&>svg]:fill-muted-foreground/50 [&>svg]:w-42"
    dangerouslySetInnerHTML={{ __html: siCoinbase.svg }}
  />,
  <span
    key="github"
    className="text-muted-foreground [&>svg]:fill-muted-foreground/50 [&>svg]:w-14"
    dangerouslySetInnerHTML={{ __html: siGithub.svg }}
  />,
  <span
    key="microsoft"
    className="[&>img]:w-46 [&>img]:opacity-50 [&>img]:grayscale [&>img]:dark:invert"
  >
    <img
      src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Microsoft_logo_%282012%29.svg/3840px-Microsoft_logo_%282012%29.svg.png"
      alt="Microsoft"
    />
  </span>,
  <span
    key="vmware"
    className="text-muted-foreground [&>svg]:fill-muted-foreground/50 [&>svg]:w-36"
    dangerouslySetInnerHTML={{ __html: siVmware.svg }}
  />,
  <span
    key="netflix"
    className="text-muted-foreground [&>svg]:fill-muted-foreground/50 [&>svg]:w-11"
    dangerouslySetInnerHTML={{ __html: siNetflix.svg }}
  />,
  <span
    key="doordash"
    className="text-muted-foreground [&>svg]:fill-muted-foreground/50 [&>svg]:w-14"
    dangerouslySetInnerHTML={{ __html: siDoordash.svg }}
  />,

  <span
    key="dropbox"
    className="text-muted-foreground [&>svg]:fill-muted-foreground/50 [&>svg]:w-12"
    dangerouslySetInnerHTML={{ __html: siDropbox.svg }}
  />,
  <span
    key="google"
    className="[&>img]:w-38 [&>img]:opacity-50 [&>img]:grayscale [&>img]:dark:invert"
  >
    <img
      src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Google_2015_logo.svg/3840px-Google_2015_logo.svg.png"
      alt="Google"
    />
  </span>,
  <span
    key="expedia"
    className="text-muted-foreground [&>svg]:fill-muted-foreground/50 [&>svg]:w-12"
    dangerouslySetInnerHTML={{ __html: siExpedia.svg }}
  />,
  <span
    key="amazon"
    className="[&>img]:w-34 [&>img]:opacity-30 [&>img]:grayscale [&>img]:dark:invert"
  >
    <img
      src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Amazon_logo.svg/3840px-Amazon_logo.svg.png"
      alt="Amazon"
    />
  </span>,
  <span
    key="cloudflare"
    className="text-muted-foreground [&>svg]:fill-muted-foreground/50 [&>svg]:w-18"
    dangerouslySetInnerHTML={{ __html: siCloudflare.svg }}
  />,
  <span
    key="roblox"
    className="text-muted-foreground [&>svg]:fill-muted-foreground/50 [&>svg]:w-14"
    dangerouslySetInnerHTML={{ __html: siRoblox.svg }}
  />,
  <span
    key="meta"
    className="text-muted-foreground [&>svg]:fill-muted-foreground/50 [&>svg]:w-16"
    dangerouslySetInnerHTML={{ __html: siMeta.svg }}
  />,
];

export function CompanyCarousel() {
  // Duplicate the list so the seam is invisible
  const track = [...logos, ...logos];

  return (
    <div className="relative w-full overflow-hidden pt-3">
      {/* Fade edges */}
      <div className="from-background pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r to-transparent" />
      <div className="from-background pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l to-transparent" />

      <motion.div
        className="flex items-center gap-8 sm:gap-16"
        style={{ width: "max-content" }}
        animate={{ x: ["0%", "-50%"] }}
        transition={{
          duration: 70,
          ease: "linear",
          repeat: Infinity,
        }}
      >
        {track.map((logo, i) => (
          <div key={i} className="flex shrink-0 items-center">
            {logo}
          </div>
        ))}
      </motion.div>
    </div>
  );
}
