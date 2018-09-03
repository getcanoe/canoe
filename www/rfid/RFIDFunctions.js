function arraycopy(src,srcPos,dest,destPos,length)
{
    if(dest==null)
        dest = new Array();
    var srcStart = srcPos;
    var srcEnd = srcPos+(length-1);
    var m=destPos;
    for(var i=srcStart; i<=srcEnd; i++)
    {
        dest[m] = src[i];
        m++;
    }
    return dest;
}