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

@group(0) @binding(0) var<storage, read> partials: array<vec4<f32>>;
@group(0) @binding(1) var<storage, read> sitesCurrent: array<vec2<f32>>;
@group(0) @binding(2) var<storage, read_write> sitesNext: array<vec2<f32>>;
@group(0) @binding(3) var<uniform> config: Config;
var<workgroup> sums: array<vec4<f32>, 128>;

// Each site reduces its tiles in a fixed order, then writes only its next position.
@compute @workgroup_size(128)
fn main(
  @builtin(workgroup_id) group: vec3<u32>,
  @builtin(local_invocation_index) lane: u32,
) {
  let site = group.x;
  if (site >= config.pointCount) { return; }
  var contribution = vec4<f32>(0.0);
  for (var tile = lane; tile < config.tileCount; tile += 128u) {
    contribution += partials[site * config.tileCount + tile];
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
    let total = sums[0];
    if (total.z > 0.0) {
      sitesNext[site] = total.xy / total.z;
    } else {
      sitesNext[site] = sitesCurrent[site];
    }
  }
}
