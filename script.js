
class SlidingPuzzle {

   constructor(puzzleElement) {

      const tileImgSrc = puzzleElement.getAttribute("img");

      this.nx = puzzleElement.getAttribute("nx") !== null ? Number(puzzleElement.getAttribute("nx")) : 3;
      this.ny = puzzleElement.getAttribute("ny") !== null ? Number(puzzleElement.getAttribute("ny")) : 3;
      this.border = puzzleElement.getAttribute("border") !== null ? puzzleElement.getAttribute("border") : 2;
      this.bgcolor = puzzleElement.getAttribute("bgcolor");
      this.width = puzzleElement.getAttribute("width");
      this.height = puzzleElement.getAttribute("height");

      this.htmlForCellIndex = [];
      this.htmlForTileIndex = [];
      this.htmlImgForTileIndex = [];
      this.tileIndexForCellIndex = [];
      
      this.adjacentCellIndexOffsetsForCellIndex = [];
      this.adjacentCellIndexOffsetForKeyPressForCellIndex = [];
      
      this.activeTileCellIndex = null;
      this.numTileMismatches = 0;

      this.timeForLastClickOnActiveTile = 0;

      this.clickTimeout = null;

      this.htmlForBoard = this.createBoard(this.nx, this.ny);

      this.tileImg = null;
      if (tileImgSrc !== null) {
         this.htmlForBoard.style.display = "none";
         this.tileImg = new Image();
         this.tileImg.src = tileImgSrc;
         this.tileImg.onload = () => {
            this.sizeTiles(this.nx, this.ny);
            this.htmlForBoard.style.display = "block";
         }
      }

      this.createTiles(this.nx, this.ny);
      this.sizeTiles(this.nx, this.ny);

      this.tileIndexForCellIndex = new Array(this.htmlForCellIndex.length);
      this.associateTilesWithCells();
      this.updateBoard();

      let windowResizeTimeout;
      window.addEventListener('resize', () => {clearTimeout(windowResizeTimeout); windowResizeTimeout = setTimeout(() => {this.sizeTiles(this.nx, this.ny)}, 250)});

      puzzleElement.style.display = "block";
      puzzleElement.append(this.htmlForBoard);
   }

   getHTML() {
      return (this.htmlForBoard);
   }

   createBoard(nx, ny) {   
      const htmlForBoard = document.createElement("table");
      if (this.border !== null) {
         htmlForBoard.style.borderSpacing = this.border + "px";
      }
      if (this.bgcolor !== null) {
         htmlForBoard.style.backgroundColor = this.bgcolor;
      }
      
      // Create board cells.
      for (let y = 0; y < ny; y++) {
         for (let x = 0; x < nx; x++) {
            const cellIndex = (y * nx) + x;
            const htmlForCell = document.createElement("td");

            htmlForCell.style.padding = "0px";
            this.htmlForCellIndex.push(htmlForCell);
         }
      }
   
      // Add board cells to the board.
      for (let y = ny-1; y >= 0; y--) {
         const htmlForBoardRow = document.createElement("tr");
         htmlForBoard.append(htmlForBoardRow);
         for (let x = 0; x < nx; x++) {
            const cellIndex = (y * nx) + x;
            htmlForBoardRow.append(this.htmlForCellIndex[cellIndex]);
         }
      }
   
      // Add event listeners to board cells.
      for (let cellIndex = 0; cellIndex < this.htmlForCellIndex.length; cellIndex++) {
         const cell = this.htmlForCellIndex[cellIndex];
         // Must use arrow function so that "this" resolves to current object instead of cell.
         cell.addEventListener("click", (event) => {this.tableCellClick(cellIndex, event)});
      }
   
      // Populate adjacentCellIndexOffsetsForCellIndex to store cell adjacencies.
      const adjacentCellXYOffsets = [[-1, 0, "ArrowRight"], [1, 0, "ArrowLeft"], [0, -1, "ArrowUp"], [0, 1, "ArrowDown"]];
      for (let y = 0; y < ny; y++) {
         for (let x = 0; x < nx; x++) {
            const cellIndex = (y * nx) + x;
            const adjacentCellIndexOffsets = [];
            const adjacentCellIndexOffsetForKeyPress = new Map();
            for (let adjacentCellXYOffset of adjacentCellXYOffsets) {
               let adjacentCellX = x + adjacentCellXYOffset[0];
               let adjacentCellY = y + adjacentCellXYOffset[1];
               const keyPress = adjacentCellXYOffset[2];
   
               if ((adjacentCellX >= 0) && (adjacentCellX < nx) && (adjacentCellY >= 0) && (adjacentCellY < ny)) {
                  const adjacentCellIndex = (adjacentCellY * nx) + adjacentCellX;
                  const adjacentCellIndexOffset = adjacentCellIndex - cellIndex;
                  adjacentCellIndexOffsets.push(adjacentCellIndexOffset);
                  if (keyPress != null) {
                     adjacentCellIndexOffsetForKeyPress.set(keyPress, adjacentCellIndexOffset);
                  }
               }
            }
   
            this.adjacentCellIndexOffsetsForCellIndex[cellIndex] = adjacentCellIndexOffsets;
            this.adjacentCellIndexOffsetForKeyPressForCellIndex[cellIndex] = adjacentCellIndexOffsetForKeyPress;
         }
      }
   
      // Must use arrow function so that "this" resolves to current object instead of document.body.
      document.body.addEventListener("keydown", (event) => {
         if (this.activeTileCellIndex === null) {
         }
         else {
            const adjacentCellIndexOffset = this.adjacentCellIndexOffsetForKeyPressForCellIndex[this.activeTileCellIndex].get(event.code);
            if (adjacentCellIndexOffset != null) {
               const adjacentCellIndexSelected = this.activeTileCellIndex + adjacentCellIndexOffset;
               this.moveActiveTileToCellIndex(adjacentCellIndexSelected, true);   
            }
         }
      });

      return (htmlForBoard);
   }

   createTiles(nx, ny) {
      // Populate tileIndexForCellIndex and htmlForTileIndex data structures.
   
      const numTiles = (nx * ny);
      for (let tileIndex = 0; tileIndex < numTiles; tileIndex++) {
         // The HTML for an image tile consists of an IMG contained within a DIV.
         // The DIV has a fixed width and height.
         // The IMG is sourced by the image but is offsetted so that only a portion
         // the scaled image appears in the DIV.   Other portions of he image
         // "overflow" the DIV boundaries and are hidden.
         // The HTML for a text tile consists of text contained within a DIV.
   
         const htmlForTile = document.createElement("div");
         htmlForTile.style.display = "block";
         htmlForTile.style.overflow = "hidden";

         if (this.tileImg !== null) {
            // Create an image tile.
            const htmlImgForTile = document.createElement("img");
            htmlImgForTile.src = this.tileImg.src;
            htmlImgForTile.style.display = "block";
            htmlImgForTile.style.position = "relative";
            htmlForTile.append(htmlImgForTile);

            this.htmlImgForTileIndex.push(htmlImgForTile);
         }
         else {
            // Create a text tile.
            const x = tileIndex % nx;
            const y = Math.floor(tileIndex / nx);   
            const tileNumber = (((ny-1) - y) * nx) + x + 1;   
            htmlForTile.style.fontSize = "xxx-large";
            htmlForTile.style.textAlign = "center";
            htmlForTile.append(tileNumber);
         }
         this.htmlForTileIndex.push(htmlForTile);
      }
   }

   sizeTiles(nx, ny) {

      // For image tile:
      // width=null,   height=null    Image width and height
      // width=Number  height=Number  Fix width and height
      // width=Number  height=null    Fix width and set height to maintain aspect ratio
      // width=null    height=Number  Fix height and set width to maintain aspect ratio
      // width="fit"   height="fit"   Fit width to window and fit height to window
      // width="fit"   height=null    Fix width to window and set height to maintain aspect ratio
      // width=null    height="fit"   Fix height to window and set width to maintain aspect ratio
      // width="auto"  height="auto"  Fit width to window or fit height to window while maintaining aspect ratio
      // width="auto"  height=null    Fit width to window or fit height to window while maintaining aspect ratio
      // width=null    height="auto"  Fit width to window or fit height to window while maintaining aspect ratio
      
      // Tiles are not created yet.
      if (this.htmlForTileIndex.length == 0) {
         return;
      }
     
      let puzzleWidth = "95vw";
      let puzzleHeight = "95vh";

      if ((this.tileImg !== null) && (this.tileImg.naturalWidth > 0) && (this.tileImg.naturalHeight > 0)) {

         const imgWidthOverHeight = this.tileImg.naturalWidth / this.tileImg.naturalHeight;
         const windowWidthOverHeight = window.innerWidth / window.innerHeight;

         if (this.width === null) {
            puzzleWidth = null;
         }
         else if (! isNaN(parseInt(this.width))) {
            puzzleWidth = Number(this.width);
         }
         else if (this.width === "fit") {
            puzzleWidth = window.innerWidth - (this.border * (nx+1));
         }
         else if (this.width === "auto") {
            if (imgWidthOverHeight < windowWidthOverHeight) {
               puzzleWidth = Math.floor((window.innerHeight - (this.border * (ny+1))) * imgWidthOverHeight);
            }
            else {
               puzzleWidth = window.innerWidth - (this.border * (nx+1));
            }
         }
         else {
            puzzleWidth = null;
         }

         if (this.height === null) {
            puzzleHeight = null;
         }
         else if (! isNaN(parseInt(this.height))) {
            puzzleHeight = Number(this.height);
         }
         else if (this.height === "fit") {
            puzzleHeight = window.innerHeight - (this.border * (ny+1));
         }
         else if (this.height === "auto") {
            if (imgWidthOverHeight < windowWidthOverHeight) {
               puzzleHeight = window.innerHeight - (this.border * (ny+1));
            }
            else {
               puzzleHeight = Math.floor((window.innerWidth - (this.border * (nx+1))) / imgWidthOverHeight);
            }
         }
         else {
            puzzleHeight = null;
         }

         if ((puzzleWidth === null) && (puzzleHeight === null)) {
            puzzleWidth = this.tileImg.naturalWidth;
            puzzleHeight = this.tileImg.naturalHeight;
         }

         if (puzzleWidth == null) {
            puzzleWidth = Math.floor(puzzleHeight * imgWidthOverHeight);
         }
         if (puzzleHeight == null) {
            puzzleHeight = Math.floor(puzzleWidth / imgWidthOverHeight);
         }

         puzzleWidth += "px";
         puzzleHeight += "px";
      }

      const tileWidthStr = "(" + puzzleWidth + " / " + nx + ")";
      const tileHeightStr = "(" + puzzleHeight + " / " + ny + ")";

      const numTiles = (nx * ny);
      for (let tileIndex = 0; tileIndex < numTiles; tileIndex++) {

         const htmlForTile = this.htmlForTileIndex[tileIndex];
         htmlForTile.style.width = "calc(" + tileWidthStr + ")";
         htmlForTile.style.height = "calc(" + tileHeightStr + ")";
         htmlForTile.style.lineHeight = htmlForTile.style.height;

         if (this.tileImg !== null) {
            const x = tileIndex % nx;
            const y = Math.floor(tileIndex / nx);
   
            const htmlImgForTile = this.htmlImgForTileIndex[tileIndex];
            htmlImgForTile.style.width = puzzleWidth;
            htmlImgForTile.style.height = puzzleHeight;
            htmlImgForTile.style.right = "calc(" + x + " * " + tileWidthStr + ")";
            htmlImgForTile.style.bottom = "calc(" + ((ny-1) - y) + " * " + tileHeightStr + ")";
         }
      }
   }

   associateTilesWithCells() {
      for (let cellIndex = 0; cellIndex < this.tileIndexForCellIndex.length; cellIndex++) {
         const tileIndex = cellIndex;
         this.tileIndexForCellIndex[cellIndex] = tileIndex;
      }
      this.numTileMismatches = 0;
   }


   updateBoard() {
      // Remove any tiles from the board first.
      for (let cellIndex = 0; cellIndex < this.htmlForCellIndex.length; cellIndex++) {
         if (this.htmlForCellIndex[cellIndex].firstChild !== null) {
            this.htmlForCellIndex[cellIndex].removeChild(this.htmlForCellIndex[cellIndex].firstChild);
         }
      }
   
      // Add tiles to the board.
      for (let cellIndex = 0; cellIndex < this.htmlForCellIndex.length; cellIndex++) {
         const tileIndex = this.tileIndexForCellIndex[cellIndex];
         this.htmlForCellIndex[cellIndex].append(this.htmlForTileIndex[tileIndex]);
      }
   }

   shuffleTilesOnBoard(numMoves) {
      for (let imove = 0; imove < numMoves; imove++) {
         const adjacentCellIndexOffsets = this.adjacentCellIndexOffsetsForCellIndex[this.activeTileCellIndex];
         const adjacentCellIndexOffsetSelected = adjacentCellIndexOffsets[Math.floor(Math.random() * adjacentCellIndexOffsets.length)];
         const adjacentCellIndexSelected = this.activeTileCellIndex + adjacentCellIndexOffsetSelected;
         this.moveActiveTileToCellIndex(adjacentCellIndexSelected);
      }
   }
   
   moveActiveTileToCellIndex(cellIndex, updateTableCell=false) {
   
      if (this.activeTileCellIndex === null) {
         // This is the very first move.
         if (updateTableCell) {
            const tileIndex = this.tileIndexForCellIndex[cellIndex];
            this.htmlForTileIndex[tileIndex].style.display = "none";
         }
      }
      else if (cellIndex === null) {
         // This is a move to end the game (and restart).
         if (updateTableCell) {
            const activeTileIndex = this.tileIndexForCellIndex[this.activeTileCellIndex];
            this.htmlForTileIndex[activeTileIndex].style.display = "block";
         }
      }
      else {
         // This is a subsequent move.
         // Update the number of mismatches after this move.
         if (this.tileIndexForCellIndex[this.activeTileCellIndex] === this.activeTileCellIndex) {
            if (this.tileIndexForCellIndex[cellIndex] !== this.activeTileCellIndex) {
               // Matched before this move, mismatched after.
               this.numTileMismatches++;
            }
         }
         else {
            if (this.tileIndexForCellIndex[cellIndex] === this.activeTileCellIndex) {
               // Mismatched before this move, matched after.
               this.numTileMismatches--;
            }
         }
   
         if (this.tileIndexForCellIndex[cellIndex] === cellIndex) {
            if (this.tileIndexForCellIndex[this.activeTileCellIndex] !== cellIndex) {
               // Matched before this move, mismatched after.
               this.numTileMismatches++;
            }
         }
         else {
            if (this.tileIndexForCellIndex[this.activeTileCellIndex] === cellIndex) {
               // Mismatched before this move, match after.
               this.numTileMismatches--;
            }
         }
      
         // Perform the move.
         const activeTileIndex = this.tileIndexForCellIndex[this.activeTileCellIndex];
         const otherTileIndex = this.tileIndexForCellIndex[cellIndex];
         this.tileIndexForCellIndex[this.activeTileCellIndex] = otherTileIndex;
         this.tileIndexForCellIndex[cellIndex] = activeTileIndex;
   
         if (updateTableCell) {
            const htmlForActiveTile = this.htmlForTileIndex[activeTileIndex];
            const htmlForOtherTile = this.htmlForTileIndex[otherTileIndex];
   
            this.htmlForCellIndex[this.activeTileCellIndex].removeChild(this.htmlForCellIndex[this.activeTileCellIndex].firstChild);
            this.htmlForCellIndex[cellIndex].removeChild(this.htmlForCellIndex[cellIndex].firstChild);
   
            this.htmlForCellIndex[this.activeTileCellIndex].appendChild(htmlForOtherTile);
            this.htmlForCellIndex[cellIndex].appendChild(htmlForActiveTile);
   
            if (this.numTileMismatches === 0) {
               const tileIndex = this.tileIndexForCellIndex[cellIndex];
               this.htmlForTileIndex[tileIndex].style.display = "block";
               cellIndex = null;
            }   
         }
      }
   
      this.activeTileCellIndex = cellIndex;
   }

   tableCellClick(cellIndex, event) {
      if (this.activeTileCellIndex === null) {
         // Before the game.
         // An active tile is selected to start the game.
         if (this.clickTimeout == null) {
            const tileIndex = this.tileIndexForCellIndex[cellIndex];
            this.moveActiveTileToCellIndex(cellIndex, true);
            while (this.numTileMismatches === 0) {
               this.shuffleTilesOnBoard(10 * this.tileIndexForCellIndex.length);
            }
            // Wait for a short time before updating the board to start the game.
            this.clickTimeout = setTimeout(() => {this.updateBoard(); this.clickTimeout = null}, 700);
         }
      }
      else {
         // During the game.
         if (cellIndex === this.activeTileCellIndex) {
            const now = new Date().getTime();
            if (now - this.timeForLastClickOnActiveTile < 300) {
               // A double-click or double-tap is detected on the active tile is detected.
               // Restart the game.
               this.moveActiveTileToCellIndex(null, true);
               this.associateTilesWithCells();
               this.updateBoard();
            }
            this.timeForLastClickOnActiveTile = now;
         }
         else {
            // A click or tap is detected on an adjacent tile.
            for (let adjacentCellIndexOffset of this.adjacentCellIndexOffsetsForCellIndex[this.activeTileCellIndex]) {
               if (this.activeTileCellIndex + adjacentCellIndexOffset === cellIndex) {
                  this.moveActiveTileToCellIndex(cellIndex, true);
               }
            }
         }
      }
   }
}

function main() {
   const queryString = window.location.search;
   const urlParams = new URLSearchParams(queryString);

   for (const puzzleElement of document.getElementsByTagName('puzzle')) {
      // Add all URL param settings to the puzzle element as attribute settings.
      for (const [key, value] of urlParams.entries()) {
         puzzleElement.setAttribute(key, value);
      }
      new SlidingPuzzle(puzzleElement);
   }
}

main();