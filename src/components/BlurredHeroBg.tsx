import heroImg from "@/assets/hero-community.jpg";

export function BlurredHeroBg() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <img
        src={heroImg}
        alt=""
        aria-hidden
        className="w-full h-full object-cover scale-105"
        style={{ filter: "blur(8px)" }}
      />
      <div className="absolute inset-0 bg-background/28" />
    </div>
  );
}
