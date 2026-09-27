struct Config {
  width: u32,
  height: u32,
  sampleColumns: u32,
  sampleCount: u32,
  pointCount: u32,
  sampleStep: u32,
  tileCount: u32,
  weighted: u32,
}

@group(0) @binding(0) var<storage, read> owners: array<u32>;
@group(0) @binding(1) var<storage, read> brightness: array<f32>;
@group(0) @binding(2) var<storage, read_write> partials: array<vec4<f32>>;
@group(0) @binding(3) var<uniform> config: Config;
var<workgroup> sums: array<vec4<f32>, 128>;

// One workgroup owns one (site, tile) pair; no floating-point atomics.
@compute @workgroup_size(128)
fn main(
  @builtin(workgroup_id) group: vec3<u32>,
  @builtin(local_invocation_index) lane: u32,
) {
  let tile = group.x;
  let site = group.y;
  var contribution = vec4<f32>(0.0);
  for (var offset = lane; offset < 256u; offset += 128u) {
    let sampleIndex = tile * 256u + offset;
    if (sampleIndex < config.sampleCount && owners[sampleIndex] == site) {
      let x = (sampleIndex % config.sampleColumns) * config.sampleStep;
      let y = (sampleIndex / config.sampleColumns) * config.sampleStep;
      var weight = 1.0;
      if (config.weighted != 0u) {
        weight = 1.0 - brightness[y * config.width + x];
      }
      contribution += vec4<f32>(weight * f32(x), weight * f32(y), weight, 0.0);
    }
  }
  sums[lane] = contribution;
  workgroupBarrier();

  var stride = 64u;
  loop {
    if (stride == 0u) { break; }
    if (lane < stride) { sums[lane] += sums[lane + stride]; }
    workgroupBarrier();
    stride = stride / 2u;
  }
  if (lane == 0u) {
    partials[site * config.tileCount + tile] = sums[0];
  }
}
