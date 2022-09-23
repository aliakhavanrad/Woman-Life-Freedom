uniform float amplitude;
uniform float uTime;
uniform sampler2D uComputePositionTexture;

attribute vec3 aColor;
attribute float aNoise;
attribute vec2 reference;

varying vec4 varColor;

void main()
{
     varColor = vec4(aColor, 1.0);
     vec4 tmpPos = texture2D( uComputePositionTexture, reference );
     
     vec4 pos = vec4(tmpPos.xyz, 1.0);
     pos.x += sin( 3.0 * aNoise * uTime) * 2.0 * aNoise;
     pos.y += cos( 7.0 * aNoise * uTime) * 4.0 * aNoise;
     pos.z += cos( 10.0 * aNoise * uTime) * aNoise * 4.0;
     //svec4 pos = vec4(reference.xy, 0.0, 1.0);
     
     vec4 modelPosition = modelMatrix * pos;
     vec4 viewPosition = viewMatrix * modelPosition;
     
     gl_Position = projectionMatrix * viewPosition;

     gl_PointSize = 10.0 / gl_Position.z;
}