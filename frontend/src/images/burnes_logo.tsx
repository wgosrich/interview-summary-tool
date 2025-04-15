import Image from "next/image";

export default function BurnesLogo() {
  return (
    <Image
      src="/burnes_logo.png"
      alt="Burnes Logo"
      width={2000}
      height={2000}
      className="rounded-full invert"
    />
  );
}
