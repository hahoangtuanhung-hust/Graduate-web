/**
 * Liquid Glass WebGL component
 *
 * Adapted from archisvaze/liquid-glass/webgl.html. The control panel is
 * intentionally omitted: each target reads its own data-liquid-glass-* API.
 * One full-screen renderer can draw several reusable glass surfaces.
 */
(function () {
  'use strict';

  const SELECTOR = '[data-liquid-glass]';
  const MAX_PIXEL_RATIO = 2;
  const GRADIENT_STOPS = {
    dark: [
      [0, '#0b1628'],
      [0.36, '#123b46'],
      [0.68, '#23615b'],
      [1, '#6a5547'],
    ],
    light: [
      [0, '#f2e6d5'],
      [0.36, '#d5e5da'],
      [0.68, '#a9c8be'],
      [1, '#f8f0df'],
    ],
  };
  const DEFAULTS = {
    radius: 20,
    bezel: 30,
    thickness: 52,
    ior: 1.5,
    blur: 1.75,
    specular: 0.52,
    tint: 0.08,
    shadow: 0.42,
  };
  let activeMount = null;

  const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}`;

  // Refraction profile and specular highlight logic are adapted from the
  // upstream Three.js WebGL demo, with uniforms scoped per target element.
  const fragmentShader = `
precision highp float;
varying vec2 vUv;

uniform vec2 uResolution;
uniform vec2 uGlassCenter;
uniform vec2 uGlassSize;
uniform vec4 uClipRect;
uniform float uRadius;
uniform float uBezel;
uniform float uThickness;
uniform float uIOR;
uniform float uBlur;
uniform float uSpecular;
uniform float uTint;
uniform float uShadow;
uniform sampler2D uBgTex;
uniform float uBgAspect;

float sdRoundedRect(vec2 p, vec2 halfSize, float r) {
  vec2 q = abs(p) - halfSize + r;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}

float surfaceHeight(float t) {
  float s = 1.0 - t;
  return pow(1.0 - s*s*s*s, 0.25);
}

vec3 sampleBg(vec2 screenUV) {
  float screenAspect = uResolution.x / uResolution.y;
  vec2 uv = screenUV;
  if (uBgAspect > screenAspect) {
    float s = screenAspect / uBgAspect;
    uv.x = uv.x * s + (1.0 - s) * 0.5;
  } else {
    float s = uBgAspect / screenAspect;
    uv.y = uv.y * s + (1.0 - s) * 0.5;
  }
  uv.y = 1.0 - uv.y;
  return texture2D(uBgTex, uv).rgb;
}

vec3 sampleBgBlurred(vec2 uv, float radius) {
  if (radius < 0.5) return sampleBg(uv);
  vec3 sum = vec3(0.0);
  vec2 px = 1.0 / uResolution;
  vec2 offsets[16];
  offsets[0]  = vec2(-0.94201, -0.39906);
  offsets[1]  = vec2( 0.94558, -0.76890);
  offsets[2]  = vec2(-0.09418, -0.92938);
  offsets[3]  = vec2( 0.34495,  0.29387);
  offsets[4]  = vec2(-0.91588, -0.45771);
  offsets[5]  = vec2(-0.81544,  0.48568);
  offsets[6]  = vec2(-0.38277, -0.56071);
  offsets[7]  = vec2(-0.12675,  0.84686);
  offsets[8]  = vec2( 0.89642,  0.41254);
  offsets[9]  = vec2( 0.18150, -0.30020);
  offsets[10] = vec2(-0.01445, -0.16001);
  offsets[11] = vec2( 0.59614,  0.71118);
  offsets[12] = vec2( 0.49742, -0.47280);
  offsets[13] = vec2( 0.80685,  0.04588);
  offsets[14] = vec2(-0.32490, -0.03965);
  offsets[15] = vec2(-0.60975,  0.06566);
  for (int i = 0; i < 16; i++) {
    sum += sampleBg(uv + offsets[i] * radius * px);
  }
  return sum / 16.0;
}

void main() {
  vec2 screenPx = vec2(vUv.x, 1.0 - vUv.y) * uResolution;

  // Keep the fixed WebGL canvas inside scroll and overflow clipping bounds.
  if (screenPx.x < uClipRect.x || screenPx.x > uClipRect.z
    || screenPx.y < uClipRect.y || screenPx.y > uClipRect.w) discard;

  vec2 p = screenPx - uGlassCenter;
  vec2 halfSize = uGlassSize * 0.5;
  float sd = sdRoundedRect(p, halfSize, uRadius);

  if (sd > 0.0) {
    float shadowFalloff = exp(-sd * sd / 800.0);
    float shadowAlpha = uShadow * shadowFalloff * 0.6;
    gl_FragColor = vec4(0.0, 0.0, 0.0, shadowAlpha);
    return;
  }

  float distFromEdge = -sd;
  float bezel = min(uBezel, min(uRadius, min(halfSize.x, halfSize.y)) - 1.0);
  float t = clamp(distFromEdge / max(bezel, 1.0), 0.0, 1.0);
  float h = surfaceHeight(t);
  float dt = 0.001;
  float h2 = surfaceHeight(min(t + dt, 1.0));
  float dh = (h2 - h) / dt;

  float slopeAngle = atan(dh * (uThickness / max(bezel, 1.0)));
  float sinR = clamp(sin(slopeAngle) / uIOR, -1.0, 1.0);
  float thetaR = asin(sinR);
  float displacement = h * uThickness * (tan(slopeAngle) - tan(thetaR));

  vec2 grad;
  float eps = 0.5;
  grad.x = sdRoundedRect(p + vec2(eps, 0.0), halfSize, uRadius) - sd;
  grad.y = sdRoundedRect(p + vec2(0.0, eps), halfSize, uRadius) - sd;
  grad = normalize(grad);

  vec2 offset = -grad * displacement / uResolution;
  vec2 screenUV = screenPx / uResolution;
  vec2 refractedUV = screenUV + offset;
  vec3 color = sampleBgBlurred(refractedUV, uBlur);

  vec2 lightDir = normalize(vec2(0.5, -0.7));
  float rimDot = abs(dot(grad, lightDir));
  float rimFalloff = 1.0 - smoothstep(0.0, bezel * 0.4, distFromEdge);
  float specHighlight = pow(rimDot * rimFalloff, 1.25);
  color += vec3(specHighlight * uSpecular * 1.35);

  float innerShadow = 1.0 - smoothstep(0.0, bezel * 0.6, distFromEdge);
  color *= mix(1.0, 0.56, innerShadow * 0.42);

  // A broad, dark bezel gives the lens the substantial edge seen in the
  // reference while the refracted color remains visible through its center.
  float bezelBand = 1.0 - smoothstep(bezel * 0.14, bezel * 0.95, distFromEdge);
  float bezelShade = pow(bezelBand, 1.15);
  color = mix(color, color * vec3(0.62, 0.75, 0.73), bezelShade * 0.7);

  float bevelLip = smoothstep(bezel * 0.2, bezel * 0.42, distFromEdge)
    * (1.0 - smoothstep(bezel * 0.42, bezel * 0.72, distFromEdge));
  color += vec3(0.22, 0.18, 0.11) * bevelLip * uSpecular * 0.8;

  float innerRim = smoothstep(0.0, 3.0, distFromEdge) * (1.0 - smoothstep(3.0, 8.0, distFromEdge));
  color += vec3(innerRim * 0.22 * uSpecular);
  color = mix(color, vec3(1.0), uTint);

  float alpha = smoothstep(0.0, 1.5, distFromEdge);
  gl_FragColor = vec4(color, alpha);
}`;

  function addFallbackClass() {
    document.documentElement.classList.add('liquid-glass-fallback');
  }

  function numberAttribute(element, name, fallback) {
    const value = Number(element.dataset[name]);
    return Number.isFinite(value) ? value : fallback;
  }

  function readPanel(element) {
    const widthAttribute = Number(element.dataset.liquidGlassWidth);
    const heightAttribute = Number(element.dataset.liquidGlassHeight);
    if (Number.isFinite(widthAttribute)) element.style.width = `${widthAttribute}px`;
    if (Number.isFinite(heightAttribute)) element.style.height = `${heightAttribute}px`;

    const rect = element.getBoundingClientRect();
    const clip = getVisibleClip(element);
    const computed = getComputedStyle(element);
    const width = Number.isFinite(widthAttribute) ? widthAttribute : rect.width;
    const height = Number.isFinite(heightAttribute) ? heightAttribute : rect.height;
    const radiusValue = numberAttribute(
      element,
      'liquidGlassRadius',
      parseFloat(computed.borderTopLeftRadius) || DEFAULTS.radius,
    );
    const radius = Math.min(radiusValue, Math.min(width, height) / 2);

    return {
      element,
      center: new THREE.Vector2(rect.left + rect.width / 2, rect.top + rect.height / 2),
      size: new THREE.Vector2(rect.width, rect.height),
      clip,
      radius: Math.max(1, radius),
      bezel: Math.max(1, numberAttribute(element, 'liquidGlassBezel', DEFAULTS.bezel)),
      thickness: Math.max(0, numberAttribute(element, 'liquidGlassThickness', DEFAULTS.thickness)),
      ior: Math.max(1, numberAttribute(element, 'liquidGlassIor', DEFAULTS.ior)),
      blur: Math.max(0, numberAttribute(element, 'liquidGlassBlur', DEFAULTS.blur)),
      specular: Math.max(0, numberAttribute(element, 'liquidGlassSpecular', DEFAULTS.specular)),
      tint: Math.min(1, Math.max(0, numberAttribute(element, 'liquidGlassTint', DEFAULTS.tint))),
      shadow: Math.min(1, Math.max(0, numberAttribute(element, 'liquidGlassShadow', DEFAULTS.shadow))),
    };
  }

  function createFallbackTexture() {
    const data = new Uint8Array([19, 43, 60, 255]);
    const texture = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
    texture.needsUpdate = true;
    return texture;
  }

  function clips(value) {
    return value === 'auto' || value === 'hidden' || value === 'clip' || value === 'scroll';
  }

  function getVisibleClip(element) {
    const clip = {
      left: 0,
      top: 0,
      right: window.innerWidth,
      bottom: window.innerHeight,
    };
    let ancestor = element.parentElement;

    while (ancestor && ancestor !== document.body) {
      const computed = getComputedStyle(ancestor);
      const clipsX = clips(computed.overflowX);
      const clipsY = clips(computed.overflowY);

      if (clipsX || clipsY) {
        const rect = ancestor.getBoundingClientRect();
        if (clipsX) {
          clip.left = Math.max(clip.left, rect.left);
          clip.right = Math.min(clip.right, rect.right);
        }
        if (clipsY) {
          clip.top = Math.max(clip.top, rect.top);
          clip.bottom = Math.min(clip.bottom, rect.bottom);
        }
      }
      ancestor = ancestor.parentElement;
    }

    return clip;
  }

  function normalizeTheme(theme) {
    return theme === 'light' ? 'light' : 'dark';
  }

  function createGradientTexture(theme) {
    const gradientCanvas = document.createElement('canvas');
    gradientCanvas.width = 1600;
    gradientCanvas.height = 1000;
    const context = gradientCanvas.getContext('2d');
    const gradient = context.createLinearGradient(0, 0, gradientCanvas.width, gradientCanvas.height);

    GRADIENT_STOPS[normalizeTheme(theme)].forEach(([stop, color]) => gradient.addColorStop(stop, color));
    context.fillStyle = gradient;
    context.fillRect(0, 0, gradientCanvas.width, gradientCanvas.height);

    const texture = new THREE.CanvasTexture(gradientCanvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    if ('colorSpace' in texture && THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
    if ('encoding' in texture && THREE.sRGBEncoding) texture.encoding = THREE.sRGBEncoding;
    texture.needsUpdate = true;
    return texture;
  }

  function mount() {
    const canvas = document.getElementById('glassCanvas');
    let elements = Array.from(document.querySelectorAll(SELECTOR));

    if (!canvas || elements.length === 0) return null;
    if (!window.THREE || !THREE.WebGLRenderer) {
      addFallbackClass();
      return null;
    }

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    } catch (error) {
      console.warn('Liquid Glass WebGL unavailable; using CSS fallback.', error);
      addFallbackClass();
      return null;
    }

    const pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geometry = new THREE.PlaneGeometry(2, 2);
    const fallbackTexture = createFallbackTexture();
    const materials = [];
    const meshes = [];
    let resizeObserver = null;
    let currentTheme = normalizeTheme(document.body.dataset.theme);
    let backdropTexture = createGradientTexture(currentTheme);
    let bgAspect = 1600 / 1000;
    let renderId = 0;

    function addMaterial(element) {
      const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
          uGlassCenter: { value: new THREE.Vector2() },
          uGlassSize: { value: new THREE.Vector2() },
          uClipRect: { value: new THREE.Vector4(0, 0, window.innerWidth, window.innerHeight) },
          uRadius: { value: DEFAULTS.radius },
          uBezel: { value: DEFAULTS.bezel },
          uThickness: { value: DEFAULTS.thickness },
          uIOR: { value: DEFAULTS.ior },
          uBlur: { value: DEFAULTS.blur },
          uSpecular: { value: DEFAULTS.specular },
          uTint: { value: DEFAULTS.tint },
          uShadow: { value: DEFAULTS.shadow },
          uBgTex: { value: fallbackTexture },
          uBgAspect: { value: bgAspect },
        },
        transparent: true,
        depthTest: false,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.frustumCulled = false;
      scene.add(mesh);
      materials.push(material);
      meshes.push(mesh);
    }

    function syncElements() {
      const nextElements = Array.from(document.querySelectorAll(SELECTOR));
      const isUnchanged = nextElements.length === elements.length
        && nextElements.every((element, index) => element === elements[index]);

      if (isUnchanged) return false;

      if (resizeObserver) {
        elements.forEach((element) => resizeObserver.unobserve(element));
      }
      meshes.forEach((mesh) => scene.remove(mesh));
      materials.forEach((material) => material.dispose());
      materials.length = 0;
      meshes.length = 0;
      elements = nextElements;
      elements.forEach(addMaterial);

      if (resizeObserver) {
        elements.forEach((element) => resizeObserver.observe(element));
      }
      return true;
    }

    elements.forEach(addMaterial);

    function updateSize() {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      const drawingWidth = canvas.width;
      const drawingHeight = canvas.height;
      materials.forEach((material) => {
        material.uniforms.uResolution.value.set(drawingWidth, drawingHeight);
      });
    }

    function render() {
      renderId = 0;
      syncElements();
      updateSize();
      const pixelRatio = renderer.getPixelRatio();
      materials.forEach((material, index) => {
        const panel = readPanel(elements[index]);
        const uniforms = material.uniforms;
        uniforms.uGlassCenter.value.set(panel.center.x * pixelRatio, panel.center.y * pixelRatio);
        uniforms.uGlassSize.value.set(panel.size.x * pixelRatio, panel.size.y * pixelRatio);
        uniforms.uClipRect.value.set(
          panel.clip.left * pixelRatio,
          panel.clip.top * pixelRatio,
          panel.clip.right * pixelRatio,
          panel.clip.bottom * pixelRatio,
        );
        uniforms.uRadius.value = panel.radius * pixelRatio;
        uniforms.uBezel.value = panel.bezel * pixelRatio;
        uniforms.uThickness.value = panel.thickness * pixelRatio;
        uniforms.uIOR.value = panel.ior;
        uniforms.uBlur.value = panel.blur * pixelRatio;
        uniforms.uSpecular.value = panel.specular;
        uniforms.uTint.value = panel.tint;
        uniforms.uShadow.value = panel.shadow;
        uniforms.uBgTex.value = backdropTexture;
        uniforms.uBgAspect.value = bgAspect;
      });
      renderer.render(scene, camera);
    }

    function scheduleRender() {
      if (!renderId) renderId = requestAnimationFrame(render);
    }

    function setTheme(theme) {
      const nextTheme = normalizeTheme(theme);
      if (nextTheme === currentTheme) {
        scheduleRender();
        return;
      }

      const previousTexture = backdropTexture;
      currentTheme = nextTheme;
      backdropTexture = createGradientTexture(currentTheme);
      bgAspect = 1600 / 1000;
      if (previousTexture && previousTexture !== fallbackTexture) previousTexture.dispose();
      scheduleRender();
    }

    window.addEventListener('resize', scheduleRender, { passive: true });
    window.addEventListener('scroll', scheduleRender, { passive: true });
    document.addEventListener('scroll', scheduleRender, { passive: true, capture: true });
    document.addEventListener('visibilitychange', scheduleRender);

    if ('ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(scheduleRender);
      elements.forEach((element) => resizeObserver.observe(element));
    }

    if ('MutationObserver' in window && document.body) {
      const mutationObserver = new MutationObserver(() => {
        if (syncElements()) scheduleRender();
      });
      mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['data-liquid-glass'],
      });
    }

    scheduleRender();

    return {
      refresh() {
        syncElements();
        scheduleRender();
      },
      setTheme,
      renderer,
      get elements() { return elements; },
      meshes,
    };
  }

  function mountAndTrack() {
    activeMount = mount();
    return activeMount;
  }

  window.LiquidGlassComponent = {
    mount: mountAndTrack,
    setTheme(theme) {
      if (activeMount) activeMount.setTheme(theme);
    },
    defaults: { ...DEFAULTS },
  };

  function init() {
    mountAndTrack();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
