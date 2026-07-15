declare module "*.woff2" {
  const assetId: number;
  export default assetId;
}

declare module "*.png" {
  const assetId: number;
  export default assetId;
}

declare module "*.svg" {
  import type { FC } from "react";
  import type { SvgProps } from "react-native-svg";
  const content: FC<SvgProps>;
  export default content;
}
