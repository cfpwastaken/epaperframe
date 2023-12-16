#!/bin/sh
# $1: input file
# $2: output file name
# use gimp to scale down, dither and convert to bmp
gimp -i -b "(convert-to-epaper \"$1\" \"$2.bmp\")" -b '(gimp-quit 0)'
# use converterTo7Color.exe with wine to convert to a C file
wine converterTo7Color.exe "$2.bmp" "$2.c"
# use convert.js to convert to a raw file
node convert.js "$2.c" "$2.raw"
# cleanup
rm "$2.bmp"
rm "$2.c"