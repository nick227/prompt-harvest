Write-Output "##active_line2##"
### APIs in routes.js:
Write-Output "##active_line3##"
Write-Output "##active_line4##"
1. **Endpoint: `PUT /api/images/:id/rating`**
Write-Output "##active_line5##"
   - **Description:** Updates the rating of an image.
Write-Output "##active_line6##"
   - **Parameters:**
Write-Output "##active_line7##"
     - `id` (URL PARAM): The ID of the image.
Write-Output "##active_line8##"
     - `rating` (BODY): The rating to give to the image.
Write-Output "##active_line9##"
   - **Response:**
Write-Output "##active_line10##"
     - Success: JSON object with updated image information.
Write-Output "##active_line11##"
     - Failure: Error message if `id` or `rating` is missing or if the update fails.
Write-Output "##active_line12##"
Write-Output "##active_line13##"
2. **Endpoint: `DELETE /like/image/:id`**
Write-Output "##active_line14##"
   - **Description:** Removes a like from the given image.
Write-Output "##active_line15##"
   - **Parameters:**
Write-Output "##active_line16##"
    @'
Write-Output "##active_line17##"
Write-Output "##active_line18##"
Set-Content -Path C:\wamp64\www\image-harvest\readme.txt -Value $apis
} catch {
    Write-Error $_
}
Write-Output "##end_of_execution##"
try {
    $ErrorActionPreference = "Stop"
Write-Output "##active_line1##"
$apis = @'
Write-Output "##active_line2##"
### APIs in routes.js:
Write-Output "##active_line3##"
Write-Output "##active_line4##"
1. **Endpoint: `PUT /api/images/:id/rating`**
Write-Output "##active_line5##"
   - **Description:** Updates the rating of an image.
Write-Output "##active_line6##"
   - **Parameters:**
Write-Output "##active_line7##"
     - `id` (URL PARAM): The ID of the image.
Write-Output "##active_line8##"
     - `rating` (BODY): The rating to give to the image.
Write-Output "##active_line9##"
   - **Response:**
Write-Output "##active_line10##"
     - Success: JSON object with updated image information.
Write-Output "##active_line11##"
     - Failure: Error message if `id` or `rating` is missing or if the update fails.
Write-Output "##active_line12##"
Write-Output "##active_line13##"
2. **Endpoint: `DELETE /like/image/:id`**
Write-Output "##active_line14##"
   - **Description:** Removes a like from the given image.
Write-Output "##active_line15##"
   - **Parameters:**
Write-Output "##active_line16##"
     - `id` (URL PARAM): The ID of the image.
Write-Output "##active_line17##"
   - **Response:**
Write-Output "##active_line18##"
     - Success: Status message indicating like was removed.
Write-Output "##active_line19##"
Write-Output "##active_line20##"
3. **Endpoint: `POST /like/image/:id`**
Write-Output "##active_line21##"
   - **Description:** Adds a like to the given image.
Write-Output "##active_line22##"
   - **Parameters:**
Write-Output "##active_line23##"
     - `id` (URL PARAM): The ID of the image.
Write-Output "##active_line24##"
   - **Response:** 
Write-Output "##active_line25##"
     - Success: Stat
} catch {
    Write-Error $_
}
Write-Output "##end_of_execution##"
try {
    $ErrorActionPreference = "Stop"
Write-Output "##active_line1##"
$apis = @'
Write-Output "##active_line2##"
### APIs in routes.js:
Write-Output "##active_line3##"
Write-Output "##active_line4##"
1. **Endpoint: `PUT /api/images/:id/rating`**
Write-Output "##active_line5##"
   - **Description:** Updates the rating of an image.
Write-Output "##active_line6##"
   - **Parameters:**
Write-Output "##active_line7##"
     - `id` (URL PARAM): The ID of the image.
Write-Output "##active_line8##"
     - `rating` (BODY): The rating to give to the image.
Write-Output "##active_line9##"
   - **Response:**
Write-Output "##active_line10##"
     - Success: JSON object with updated image information.
Write-Output "##active_line11##"
     - Failure: Error message if `id` or `rating` is missing or if the update fails.
Write-Output "##active_line12##"
Write-Output "##active_line13##"
2. **Endpoint: `DELETE /like/image/:id`**
Write-Output "##active_line14##"
   - **Description:** Removes a like from the given image.
Write-Output "##active_line15##"
   - **Parameters:**
Write-Output "##active_line16##"
     - `id` (URL PARAM): The ID of the image.
Write-Output "##active_line17##"
   - **Response:**
Write-Output "##active_line18##"
     - Success: Status message indicating like was removed.
Write-Output "##active_line19##"
Write-Output "##active_line20##"
3. **Endpoint: `POST /like/image/:id`**
Write-Output "##active_line21##"
   - **Description:** Adds a like to the given image.
Write-Output "##active_line22##"
   - **Parameters:**
Write-Output "##active_line23##"
     - `id` (URL PARAM): The ID of the image.
Write-Output "##active_line24##"
   - **Response:**
Write-Output "##active_line25##"
     - Success: Status message indicating like was added.
Write-Output "##active_line26##"
Write-Output "##active_line27##"
4. **Endpoint: `GET /api/download/:listName/:subject/:word`**
Write-Output "##active_line28##"
   - **Description:** Fetches a specific list associated with a word and subject.
Write-Output "##active_line29##"
   - **Parameters:**
Write-Output "##active_line30##"
     - `listName` (URL PARAM): The name of the list.
Write-Output "##active_line31##"
     - `subject` (URL PARAM): The subject of the list.
Write-Output "##active_line32##"
     - `word` (URL PARAM): The word associated with the list.
Write-Output "##active_line33##"
   - **Response:**
Write-Output "##active_line34##"
     - Success: JSON array of the list items.
Write-Output "##active_line35##"
Write-Output "##active_line36##"
5. **Endpoint: `GET /prompt/clauses` **
Write-Output "##active_line37##"
   - **Description:** Fetches unique prompt clauses based on the user's ID.
Write-Output "##active_line38##"
   - **Parameters:**
Write-Output "##active_line39##"
     - `limit` (QUERY): Limit the number of results (default 5).
Write-Output "##active_line40##"
   - **Response:**
Write-Output "##active_line41##"
     - Success: List of unique prompt clauses.
Write-Output "##active_line42##"
Write-Output "##active_line43##"
6. **Endpoint: `GET /image/:id/liked`**
Write-Output "##active_line44##"
   - **Description:** Checks if an image has been liked by the user.
Write-Output "##active_line45##"
   - **Parameters:**
Write-Output "##active_line46##"
     - `id` (URL PARAM): The ID of the image.
Write-Output "##active_line47##"
   - **Response:**
Write-Output "##active_line48##"
     - Success: Returns if the image is liked by the user.
Write-Output "##active_line49##"
Write-Output "##active_line50##"
Additionally there are some other endpoints like:
Write-Output "##active_line51##"
- `/image/:id/liked`
Write-Output "##active_line52##"
- `/images`
Write-Output "##active_line53##"
- `/prompts`
Write-Output "##active_line54##"
- `/images/count`
Write-Output "##active_line55##"
- `prompt/build`
Write-Output "##active_line56##"
Write-Output "##active_line57##"
