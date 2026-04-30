import { Navbar } from "@/components/Navbar";
import { MainContent } from "@/components/MainContent";
import { InteractionBar } from "@/components/InteractionBar";

export default function App() {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-bg-primary">
      <Navbar />
      <MainContent />
      <InteractionBar />
    </div>
  );
}
