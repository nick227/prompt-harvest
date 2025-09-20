    Flux

    Calls to Flux endpoints are priced depending on the number of steps and the requested resolution in megapixels:

    if >= 4 steps: $0.000725 / megapixel / step.
    if < 4 steps: $0.000225 / megapixel / step + fixed $0.002

-----------------------------------------

Stable Diffusion 1/2

Here are some examples of processing costs for images at different resolutions with 30 steps.

"Standard" refers to the following endpoints: /text2image, /image2image, /inpainting, /text-inpainting, /edit-image:

Resolution 	Standard 	/controlnet
320x320 	$0.0019 	$0.0038
512x512 	$0.0019 	$0.0038
768x768 	$0.0087 	$0.0174
1024x1024 	$0.0181 	$0.0362

-----------------------------------------

Stable Diffusion XL

XL-inferencing adopts a distinct pricing calculation method.

The maximum allowable total pixel count is 1 megapixel: the product of width and height must not exceed 1,048,576 pixels.

Pricing scales seamlessly based on the number of steps as per the following scale:

Steps 	$
10 	$0.0032
20 	$0.0054
30 	$0.0075
40 	$0.0096
80 	$0.0181
150 $0.0330

-----------------------------------------

The /inpainting_sdxl endpoint is priced as follows:

    Base cost: $0.0055 / image
    Variable cost: +$0.000199 / megapixel / step


Calls to /upscale are priced according to the input image resolution:

Resolution 	/upscale
320x320 	$0.0005
512x512 	$0.0012
768x768 	$0.0029
1024x1024 	$0.0051

-----------------------------------------

OpenAI (dalle) API costs $0.04

-----------------------------------------


Background removal

Calls to /remove-background are priced at a fixed rate of $0.001 / image, regardless of the resolution.

This also applies when the feature is used as an addon on diffusion functions through the transparent_background parameter.
