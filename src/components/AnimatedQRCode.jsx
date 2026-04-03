import { useEffect, useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

const TEXTURE_SIZE = 256;
const MAX_RIPPLES = 5;
const RIPPLE_LIFETIME = 1.7;

const VERTEX_SHADER_SOURCE = `
attribute vec2 a_position;
attribute vec2 a_uv;
varying vec2 v_uv;

void main() {
    v_uv = a_uv;
    gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER_SOURCE = `
precision highp float;

uniform sampler2D u_texture;
uniform float u_time;
uniform vec2 u_centers[${MAX_RIPPLES}];
uniform float u_starts[${MAX_RIPPLES}];
uniform int u_count;
uniform vec3 u_glowColor;

varying vec2 v_uv;

void main() {
    vec2 uv = v_uv;
    vec2 totalOffset = vec2(0.0);
    float glow = 0.0;

    for (int i = 0; i < ${MAX_RIPPLES}; i++) {
        if (i >= u_count) {
            break;
        }

        float age = u_time - u_starts[i];
        if (age < 0.0 || age > 1.7) {
            continue;
        }

        vec2 center = u_centers[i];
        vec2 delta = uv - center;
        float distanceToCenter = length(delta);

        if (distanceToCenter < 0.0008) {
            continue;
        }

        float travel = (1.0 - exp(-4.6 * age)) * 0.8;
        float waveDistance = distanceToCenter - travel;
        float envelope = smoothstep(0.12, 0.0, abs(waveDistance));
        float fade = smoothstep(1.7, 0.0, age);
        float angle = atan(delta.y, delta.x);

        float wobble = sin(distanceToCenter * 28.0 - u_time * 11.0);
        wobble += sin(distanceToCenter * 18.0 + angle * 5.0 - u_time * 7.0) * 0.65;
        wobble += sin(distanceToCenter * 42.0 - angle * 3.0 - u_time * 15.0) * 0.35;
        wobble /= 2.0;

        vec2 radial = normalize(delta);
        vec2 tangent = vec2(-radial.y, radial.x);
        vec2 direction = radial * 0.82 + tangent * 0.18;

        totalOffset += direction * wobble * envelope * fade * 0.035;

        float core = smoothstep(0.05, 0.0, abs(waveDistance));
        glow += (envelope * (abs(wobble) * 0.6 + 0.4) + core * 0.9) * fade;
    }

    vec2 chroma = length(totalOffset) > 0.0001
        ? normalize(totalOffset) * length(totalOffset) * 0.2
        : vec2(0.0);

    vec2 sampleUv = clamp(uv + totalOffset, 0.0, 1.0);
    float red = texture2D(u_texture, clamp(sampleUv + chroma * 0.4, 0.0, 1.0)).r;
    float green = texture2D(u_texture, sampleUv).g;
    float blue = texture2D(u_texture, clamp(sampleUv - chroma * 0.4, 0.0, 1.0)).b;
    float alpha = texture2D(u_texture, sampleUv).a;

    vec3 color = vec3(red, green, blue);
    color += glow * u_glowColor * 0.22;

    gl_FragColor = vec4(color, alpha);
}
`;

const compileShader = (gl, type, source) => {
    const shader = gl.createShader(type);

    if (!shader) {
        throw new Error('Unable to create shader.');
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const info = gl.getShaderInfoLog(shader) || 'Unknown shader compile error.';
        gl.deleteShader(shader);
        throw new Error(info);
    }

    return shader;
};

const combineClassNames = (...classNames) => classNames.filter(Boolean).join(' ');

const AnimatedQRCode = ({
    value,
    bgColor = '#ffffff',
    fgColor = '#1a1a1a',
    level = 'L',
    includeMargin = false,
    className,
    style,
}) => {
    const sourceWrapperRef = useRef(null);
    const displayCanvasRef = useRef(null);
    const rendererRef = useRef(null);
    const startedRef = useRef(false);
    const initialValueRef = useRef(value);
    const [shaderEnabled, setShaderEnabled] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return undefined;
        }

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            setShaderEnabled(false);
            return undefined;
        }

        const displayCanvas = displayCanvasRef.current;
        if (!displayCanvas) {
            return undefined;
        }

        const gl = displayCanvas.getContext('webgl', {
            alpha: true,
            antialias: true,
            premultipliedAlpha: true,
        });

        if (!gl) {
            setShaderEnabled(false);
            return undefined;
        }

        try {
            const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
            const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE);
            const program = gl.createProgram();

            if (!program) {
                throw new Error('Unable to create shader program.');
            }

            gl.attachShader(program, vertexShader);
            gl.attachShader(program, fragmentShader);
            gl.linkProgram(program);

            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                throw new Error(gl.getProgramInfoLog(program) || 'Unknown program link error.');
            }

            const buffer = gl.createBuffer();

            if (!buffer) {
                throw new Error('Unable to create vertex buffer.');
            }

            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.bufferData(
                gl.ARRAY_BUFFER,
                new Float32Array([
                    -1, -1, 0, 0,
                    1, -1, 1, 0,
                    -1, 1, 0, 1,
                    1, 1, 1, 1,
                ]),
                gl.STATIC_DRAW,
            );

            gl.useProgram(program);

            const positionLocation = gl.getAttribLocation(program, 'a_position');
            const uvLocation = gl.getAttribLocation(program, 'a_uv');

            gl.enableVertexAttribArray(positionLocation);
            gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 16, 0);

            gl.enableVertexAttribArray(uvLocation);
            gl.vertexAttribPointer(uvLocation, 2, gl.FLOAT, false, 16, 8);

            const texture = gl.createTexture();

            if (!texture) {
                throw new Error('Unable to create texture.');
            }

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.uniform1i(gl.getUniformLocation(program, 'u_texture'), 0);

            rendererRef.current = {
                gl,
                program,
                vertexShader,
                fragmentShader,
                buffer,
                texture,
                uniforms: {
                    time: gl.getUniformLocation(program, 'u_time'),
                    centers: gl.getUniformLocation(program, 'u_centers'),
                    starts: gl.getUniformLocation(program, 'u_starts'),
                    count: gl.getUniformLocation(program, 'u_count'),
                    glowColor: gl.getUniformLocation(program, 'u_glowColor'),
                },
                ripples: [],
                frameId: null,
                startTime: performance.now(),
            };

            const initialSourceCanvas = sourceWrapperRef.current?.querySelector('canvas');

            if (initialSourceCanvas) {
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.texImage2D(
                    gl.TEXTURE_2D,
                    0,
                    gl.RGBA,
                    gl.RGBA,
                    gl.UNSIGNED_BYTE,
                    initialSourceCanvas,
                );
            }

            const renderFrame = () => {
                const renderer = rendererRef.current;

                if (!renderer) {
                    return;
                }

                const elapsed = (performance.now() - renderer.startTime) / 1000;
                const centers = new Float32Array(MAX_RIPPLES * 2).fill(0.5);
                const starts = new Float32Array(MAX_RIPPLES).fill(-99);

                renderer.ripples = renderer.ripples.filter((ripple) => elapsed - ripple.start < RIPPLE_LIFETIME);

                renderer.ripples.forEach((ripple, index) => {
                    centers[index * 2] = ripple.x;
                    centers[index * 2 + 1] = ripple.y;
                    starts[index] = ripple.start;
                });

                gl.viewport(0, 0, displayCanvas.width, displayCanvas.height);
                gl.clearColor(0, 0, 0, 0);
                gl.clear(gl.COLOR_BUFFER_BIT);
                gl.useProgram(program);
                gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
                gl.uniform1f(renderer.uniforms.time, elapsed);
                gl.uniform2fv(renderer.uniforms.centers, centers);
                gl.uniform1fv(renderer.uniforms.starts, starts);
                gl.uniform1i(renderer.uniforms.count, renderer.ripples.length);
                gl.uniform3f(renderer.uniforms.glowColor, 0.12, 0.62, 1.0);
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
                renderer.frameId = window.requestAnimationFrame(renderFrame);
            };

            setShaderEnabled(true);
            renderFrame();

            return () => {
                const renderer = rendererRef.current;

                if (renderer?.frameId) {
                    window.cancelAnimationFrame(renderer.frameId);
                }

                gl.deleteTexture(texture);
                gl.deleteBuffer(buffer);
                gl.deleteProgram(program);
                gl.deleteShader(vertexShader);
                gl.deleteShader(fragmentShader);
                rendererRef.current = null;
            };
        } catch (error) {
            console.error('Animated QR shader failed to initialize:', error);
            setShaderEnabled(false);
        }

        return undefined;
    }, []);

    useEffect(() => {
        const renderer = rendererRef.current;
        const sourceCanvas = sourceWrapperRef.current?.querySelector('canvas');

        if (!renderer || !sourceCanvas) {
            return undefined;
        }

        renderer.gl.bindTexture(renderer.gl.TEXTURE_2D, renderer.texture);
        renderer.gl.texImage2D(
            renderer.gl.TEXTURE_2D,
            0,
            renderer.gl.RGBA,
            renderer.gl.RGBA,
            renderer.gl.UNSIGNED_BYTE,
            sourceCanvas,
        );

        return undefined;
    }, [value, bgColor, fgColor, level, includeMargin]);

    useEffect(() => {
        const renderer = rendererRef.current;

        if (!renderer || !value) {
            initialValueRef.current = value;
            return undefined;
        }

        const nextStart = (performance.now() - renderer.startTime) / 1000;

        if (!startedRef.current) {
            startedRef.current = true;
            initialValueRef.current = value;
            return undefined;
        }

        if (initialValueRef.current === value) {
            return undefined;
        }

        initialValueRef.current = value;
        renderer.ripples.push({ x: 0.5, y: 0.5, start: nextStart });
        renderer.ripples.push({ x: 0.5, y: 0.5, start: nextStart + 0.05 });

        if (renderer.ripples.length > MAX_RIPPLES) {
            renderer.ripples.splice(0, renderer.ripples.length - MAX_RIPPLES);
        }

        return undefined;
    }, [value]);

    return (
        <div
            className={combineClassNames('relative h-full w-full overflow-hidden', className)}
            style={style}
        >
            <div ref={sourceWrapperRef} className="pointer-events-none absolute left-0 top-0 h-0 w-0 overflow-hidden opacity-0">
                <QRCodeCanvas
                    value={value}
                    size={TEXTURE_SIZE}
                    bgColor={bgColor}
                    fgColor={fgColor}
                    level={level}
                    includeMargin={includeMargin}
                />
            </div>

            {!shaderEnabled && (
                <QRCodeCanvas
                    value={value}
                    size={TEXTURE_SIZE}
                    bgColor={bgColor}
                    fgColor={fgColor}
                    level={level}
                    includeMargin={includeMargin}
                    className="block h-full w-full"
                />
            )}

            <canvas
                ref={displayCanvasRef}
                width={TEXTURE_SIZE}
                height={TEXTURE_SIZE}
                className={combineClassNames(
                    'block h-full w-full',
                    shaderEnabled ? 'opacity-100' : 'pointer-events-none absolute inset-0 opacity-0',
                )}
            />
        </div>
    );
};

export default AnimatedQRCode;
