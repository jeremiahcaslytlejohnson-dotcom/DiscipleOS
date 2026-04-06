export default function Loading() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#09090f]">
      <div className="flex flex-col items-center">
        <img
          src="/splash.png"
          alt="DiscipleOS"
          className="w-48 h-48 object-contain mb-6"
        />
        <div className="text-white/70 text-sm tracking-wide">
          Loading DiscipleOS...
        </div>
      </div>
    </div>
  );
}