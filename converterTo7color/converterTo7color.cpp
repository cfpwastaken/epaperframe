#include <iostream>
#include <stdlib.h>
#include <stdio.h>
#include <math.h>
#include <cstdint>
#include <cstdio>

#define STB_IMAGE_IMPLEMENTATION
#include "stb_image.h"

uint8_t palette[8 * 3] = {
	0, 0, 0,
	255, 255, 255,
	67, 138, 28,
	100, 64, 255,
	191, 0, 0,
	255, 243, 56,
	232, 126, 0,
	194 ,164 , 244
};

int depalette(uint8_t* color)
{
	int p;
	int mindiff = 100000000;
	int bestc = 0;
	for (p = 0; p < sizeof(palette) / 3; p++)
	{
		int diffr = ((int)color[0]) - ((int)palette[p * 3 + 0]);
		int diffg = ((int)color[1]) - ((int)palette[p * 3 + 1]);
		int diffb = ((int)color[2]) - ((int)palette[p * 3 + 2]);
		int diff = (diffr * diffr) + (diffg * diffg) + (diffb * diffb);
		if (diff < mindiff)
		{
			mindiff = diff;
			bestc = p;
		}
	}
	return bestc;
}

int main(int argc, char** argv)
{

	if (argc < 2)
	{
		fprintf(stderr, "Usage: converter [image file] [out file]\n");
		printf("Press Enter to exit.");
		getchar();
		return -1;
	}

	int x, y, n;
	unsigned char* data = stbi_load(argv[1], &x, &y, &n, 0);
	if (!data)
	{
		fprintf(stderr, "Error: Can't open image.\n");
		printf("Press Enter to exit.");
		getchar();
		return -6;
	}
	if ((x!=600) && (x!=640) && (x!=800))
	{
		fprintf(stderr, "Error: Image dimensions must be 600*448/640*400/800*480.\n");
		printf("Press Enter to exit.");
		getchar();
		return -2;
	}
	if (x==600 && y>448)
	{
		y = 448;
	}
	if (x == 640 && y > 400)
	{
		y = 400;
	}
	if (x == 800 && y > 480)
	{
		y = 480;
	}

	int i, j;
	int err = 0;
	FILE* fout = NULL;

	if (argc == 2)
		fout = fopen("c7_image.c", "wb");
	else
		fout = fopen(argv[2], "wb");

	int num = 0;
	fprintf(fout, "// 7 Color Image Data %d*%d \r\n", x, y);
	fprintf(fout, "const unsigned char Image7color[%d] = {\r\n", x * y / 2);
	for (j = 0; j < y; j++)
	{
		for (i = 0; i < x / 2; i++)
		{
			int c1 = depalette(data + n * (i * 2 + x * j));
			int c2 = depalette(data + n * (i * 2 + x * j + 1));
			char uc = c2 | (c1 << 4);

			fprintf(fout, "0x%02X,", uc);
			if (num++ == 15)
			{
				fprintf(fout, "\r\n");
				num = 0;
			}
		}
	}
	fprintf(fout, "};\r\n");
	fclose(fout);
	stbi_image_free(data);
	return 0;
}
