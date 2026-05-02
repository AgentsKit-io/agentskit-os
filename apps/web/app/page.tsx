import { Nav } from "@/components/nav";
import { Hero } from "@/components/hero";
import { TrustStrip } from "@/components/trust-strip";
import { FlowSVG } from "@/components/flow-svg";
import { Wedge } from "@/components/wedge";
import { Features } from "@/components/features";
import { Personas } from "@/components/personas";
import { Architecture } from "@/components/architecture";
import { Quickstart } from "@/components/quickstart";
import { Roadmap } from "@/components/roadmap";
import { Waitlist } from "@/components/waitlist";
import { Footer } from "@/components/footer";

export default function Page() {
  return (
    <main>
      <Nav />
      <Hero />
      <TrustStrip />
      <FlowSVG />
      <Wedge />
      <Features />
      <Personas />
      <Architecture />
      <Quickstart />
      <Roadmap />
      <Waitlist />
      <Footer />
    </main>
  );
}
