const COMMERCIAL_PSU_WATTS = [450, 500, 550, 600, 650, 700, 750, 850, 1000, 1200, 1500];

function roundUpCommercialPsu(watts: number) {
  return COMMERCIAL_PSU_WATTS.find((value) => value >= watts) ?? Math.ceil(watts / 100) * 100;
}

export function getGpuPowerWatts(gpu: any) {
  return Number(gpu?.gpuSpecs?.gpuPowerWatts ?? gpu?.gpuSpecs?.tdp ?? 0);
}

export function getGpuRecommendedPsuWatts(gpu: any) {
  return Number(gpu?.gpuSpecs?.recommendedPsuWatts ?? 0);
}

export function calculateRecommendedPsuWatts(build: Record<string, any>) {
  const cpuTdp = Number(build.cpu?.cpuSpecs?.tdp ?? 0);
  const gpuPowerWatts = getGpuPowerWatts(build.gpu);
  const gpuRecommendedPsuWatts = getGpuRecommendedPsuWatts(build.gpu);
  const ramWatts = build.ram ? 10 : 0;
  const storageWatts = build.storage ? 10 : 0;
  const coolerWatts = build.cooler ? 15 : 0;
  const motherboardWatts = build.motherboard ? 50 : 0;
  const caseFansWatts = Number(build.case?.caseSpecs?.includedFans ?? 0) * 3;

  // gpuPowerWatts is the real GPU draw used in system consumption.
  // recommendedPsuWatts is a manufacturer floor and never replaces the real calculation.
  const calculatedWithHeadroom =
    (cpuTdp +
      gpuPowerWatts +
      motherboardWatts +
      ramWatts +
      storageWatts +
      coolerWatts +
      caseFansWatts) *
    1.25;
  return roundUpCommercialPsu(Math.max(calculatedWithHeadroom, gpuRecommendedPsuWatts));
}
