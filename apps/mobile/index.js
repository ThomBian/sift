import { registerRootComponent } from "expo";

import App from "./App";

// Explicit local entry: in this Turborepo workspace `expo` is hoisted to the
// repo-root node_modules, so the default "expo/AppEntry" resolves "../../App"
// to the repo root instead of this package. registerRootComponent avoids that.
registerRootComponent(App);
