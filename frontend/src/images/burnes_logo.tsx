import Image from "next/image";

export default function BurnesLogo() {
  return (
    <Image
      src="/burnes_logo.png"
      alt="Burnes Logo"
      width={1000}
      height={1000}
      className="rounded-full dark:filter dark:invert"
    />
  );
}
