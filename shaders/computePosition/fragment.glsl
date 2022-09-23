uniform sampler2D uTargetPosition;
uniform vec2 uMousePosition;

void main()
{
    vec2 cellSize = 1.0 / resolution.xy;
    vec2 uv = gl_FragCoord.xy * cellSize;
    
    vec4 targetPos = texture2D(uTargetPosition, uv);
    
    vec4 tmpPos = texture2D( uComputePositionTexture, uv );
    
    tmpPos.x = tmpPos.x + (targetPos.x - tmpPos.x) / 50.0;
    tmpPos.y = tmpPos.y + (targetPos.y - tmpPos.y) / 50.0;
    tmpPos.z = tmpPos.z + (targetPos.z - tmpPos.z) / 50.0;
    

    // vec2 border = normalize( vec2(uv.x, 1.0 - uv.y) - uMousePosition);
    // float distanceToMouse = length(border);
    // float strength = 1.0 / (distanceToMouse + 0.04) * 0.1;

    // tmpPos.xy += strength * border;


    gl_FragColor = vec4(tmpPos.xyz, 1.0);
         
}