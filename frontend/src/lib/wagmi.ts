import { createConfig, http } from "wagmi";
import { tempoModerato } from "../config/contracts";
import { injected } from "wagmi/connectors";

export const wagmiConfig = createConfig({
  chains: [tempoModerato],
  connectors: [injected()],
  transports: {
    [tempoModerato.id]: http("https://rpc.moderato.tempo.xyz"),
  },
});
