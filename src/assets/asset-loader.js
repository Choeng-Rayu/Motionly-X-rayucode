export async function loadAssets(scene, baseUrl = document.baseURI) {
  const entries = await Promise.all(
    scene.imports.map(async (asset) => [asset.name, await loadAsset(asset, baseUrl)])
  );
  return new Map(entries);
}

async function loadAsset(asset, baseUrl) {
  const url = new URL(asset.path, baseUrl).href;
  const image = new Image();
  image.decoding = "async";
  image.src = url;
  await image.decode();
  return Object.freeze({
    ...asset,
    url,
    image,
    width: image.naturalWidth,
    height: image.naturalHeight
  });
}

