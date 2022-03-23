#!/bin/bash

zoom=1
maxzoom=5
tilesize=256

while (( zoom <= maxzoom ));
do
  resize=$(($tilesize*zoom))
  eval "magick convert map.jpg -resize ${resize}x${resize} -crop ${tilesize}x${tilesize} -extent ${tilesize}x${tilesize} -set filename:tile ./tiles/${zoom}-%[fx:page.x/${tilesize}]-%[fx:page.y/${tilesize}] %[filename:tile].jpg"
  ((zoom++))
done