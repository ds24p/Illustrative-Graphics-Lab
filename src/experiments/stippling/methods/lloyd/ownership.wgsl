struct Config {
  width: u32,
  height: u32,
  sampleColumns: u32,
  sampleCount: u32,
  pointCount: u32,
  sampleStep: u32,
  _padding0: u32,
  _padding1: u32,
}

@group(0) @binding(0) var<storage, read> sites: array<vec2<f32>>;
@group(0) @binding(1) var<storage, read_write> owners: array<u32>;
@group(0) @binding(2) var<uniform> config: Config;

@compute @workgroup_size(128)
fn main(@builtin(global_invocation_id) invocation: vec3<u32>) {
  let index = invocation.x;
  if (index >= config.sampleCount) {
    return;
  }
  if (config.pointCount == 0u) {
    owners[index] = 0xffffffffu;
    return;
  }

  let x = (index % config.sampleColumns) * config.sampleStep;
  let y = (index / config.sampleColumns) * config.sampleStep;
  if (x >= config.width || y >= config.height) {
    owners[index] = 0xffffffffu;
    return;
  }

  let sample = vec2<f32>(f32(x), f32(y));
  let firstDelta = sample - sites[0];
  var bestDistance = firstDelta.x * firstDelta.x + firstDelta.y * firstDelta.y;
  var bestIndex = 0u;
  for (var siteIndex = 1u; siteIndex < config.pointCount; siteIndex += 1u) {
    let delta = sample - sites[siteIndex];
    let distance = delta.x * delta.x + delta.y * delta.y;
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = siteIndex;
    }
  }
  owners[index] = bestIndex;
}
