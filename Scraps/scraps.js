// function doIt(){
// 	var x;
// 	var y;
// 	fractionMode = false;
// 	integerMode = false;
// 	var theMode = document.theSpreadsheet.Mode.selectedIndex;
// 	if (document.theSpreadsheet.Mode.options[theMode].text == "Fraction") fractionMode = true;
// 	else if (document.theSpreadsheet.Mode.options[theMode].text == "Integer") integerMode = true;

// 	var num = doIt.arguments[0];

// 	//**********

// 	// Option 1 Pivot
// 	if (num == 1)
// 		{
// 		readMatrix();
// 		if(!condensed) verifyPivots();
// 		if (theMatrix[theX][theY] == 0)
// 			{
// 			okToRoll = false;
// 			document.theSpreadsheet.expr.value = "You cannot pivot on a zero."
// 			}
// 		if (okToRoll)
// 			{
// 			pivot(theMatrix,numRows,numCols,theX,theY);

// 			var leaving = theBasis[theX];
// 			if(leaving != theY){
// 				if(!condensed){
//          			if(leaving >0) paintCol(leaving, "FFFFFF", 1, maxRows);
//           			/*paintCol(theY, "DDDDDD");
// 					  document.theSpreadsheet1[maxCols*(theX-1) + theY -1].style="background-color:AAAAAA";*/
// 					 paintPivot(theX, theY); 
//           		}
// 				theBasis[theX] = theY;
// 				document.lpstuff[2*theX -2].value = theLabels[theY];
// 				for(var i = 1; i <= maxRows; i++)//cannot have two pivots in the same column
// 					if(theBasis[i] == theY && i != theX) {
// 						theBasis[i] = 0;
// 						document.lpstuff[2*(i - 1)].value = "";}
//         		if(condensed){
//                       colMap[theY- numRows] = theX;
//                       colMapInv[theX] = theY- numRows;
// 					document.labels[theY - numRows] = theLabels[theX];	  
// 				}
// 			}
// 			displayMatrix();
// 			document.theSpreadsheet.expr.value = "Done."
// 			} // of okToRoll
// 		okToRoll = true;	// reset 
// 		// readMatrix(); 	// an extra one for TESTING -- not needed
// 		} // end of this option

// 	// Option 2 // preliminary checks
// 	else  if (num == 2)
// 		{
// 		okToRoll = true;
// 		stepName = "Rounding information"
// 		var accuracydig = document.theSpreadsheet.acc.value;
		
// 		if ( (accuracydig == "") || (!looksLikeANumber(accuracydig)) ) { document.theSpreadsheet.expr.value = "Enter a value for the accuracy (Rounding) in the range 1-13."; okToRoll = false}
		
// 		if (okToRoll)
// 			{ 
// 			var thenum = eval(accuracydig); 
// 			if ((thenum < 1) || (thenum > 14)) {document.theSpreadsheet.expr.value = "Accuracy (Rounding) must be in the range 1-13."; okToRoll = false}
			
// 			else numSigDigs =thenum;

// 			} // if okToRoll
// 		} // end of this option
	
// 	// Option 3 (Erase)
// 	else  if (num == 3)
// 		{
// 		var count = 0;
// 		document.theSpreadsheet.expr.value = "";
// 		for (var i = 1; i <= maxRows; i++)
// 			{
// 			for (var j = 1; j <= maxCols; j++)
// 				{
// 				document.theSpreadsheet1[count].value = "";
// 				document.theSpreadsheet1[count].style = "background-color:FFFFFF";
// 				count++;
// 				}
// 			}
// 		document.rowops.reset();
// 		document.lpstuff.reset();
// 		//clear ratios colors
// 		for(var i= 1; i<maxRows; i++){
// 			document.lpstuff[2*i-1].style="background-color:DDDDDD";
// 		}
// 		} // end of this option
	
// 	// Option 4 Divide by this
// 	else  if (num == 4)
// 		{
// 		readMatrix();
// 		if (theMatrix[theX][theY] == 0)
// 			{
// 			okToRoll = false;
// 			document.theSpreadsheet.expr.value = "You cannot divide by zero."
// 			}
// 		if (okToRoll)
// 			{
// 			divideRowbySelection(theMatrix,numRows,numCols,theX,theY);
// 			displayMatrix();
// 			} // of okToRoll
// 		okToRoll = true;	// reset 
		
// 		} // of this option

// 	//  Option 5 General Row Operation
// 	else  if (num == 5)
// 		{
// 		readMatrix();
// 		var ast = stripSpaces(document.theSpreadsheet.a.value);
// 		var ist = stripSpaces(document.theSpreadsheet.i.value);
// 		var bst = stripSpaces(document.theSpreadsheet.b.value);
// 		var jst = stripSpaces(document.theSpreadsheet.j.value);
// 		if (ast == "") ast = "1";
// 		if (bst == "") bst = "1";
// 		if (!looksLikeANumber(ast) ||  !looksLikeANumber(bst) || !looksLikeANumber(ist) || !looksLikeANumber(jst) ) 
// 			{
// 			okToRoll = false;
// 			document.theSpreadsheet.expr.value = "You must first enter numbers in all four fields."
// 			}
// 		var a = eval(ast);
// 		var b = eval(bst);
// 		var i = eval(ist);
// 		if (jst != "") var j = eval(jst);
// 		else var j= 0;		// for a single multiple
// 		if (okToRoll) 
// 			{
// 			if  (a == 0)
// 				{
// 				okToRoll = false;
// 				document.theSpreadsheet.expr.value = "You cannot multliply the changing row by zero."
// 				}
// 			else if ( (i < 0) || (i > numRows) || (Math.round(i) != i))
// 				{
// 				okToRoll = false;
// 				document.theSpreadsheet.expr.value = "Row "+i+" is not a valid row number."
// 				}
// 			else if ( (j < 0) || (j > numRows) || (Math.round(j) != j) || (j == i))
// 				{
// 				okToRoll = false;
// 				document.theSpreadsheet.expr.value = "Row "+j+" is not a valid row number."
// 				}
// 			} // end of second batch of tests

// 		if (okToRoll)
// 			{
// 			rowOp(theMatrix,i, j, a, b);
// 			doNotReduce = true;
// 			displayMatrix();
// 			doNotReduce = false;

// 			} // of okToRoll
// 		okToRoll = true;	// reset
// 		}

// 	// Option 6 Display Operations Stack (for debugging)
// 	else  if (num == 6)
// 		{
// 		document.theSpreadsheet.output.value = "";
// 		var str = "Pointer is at #" + stackPtr + cr;
// 		str += "Format: 0/1 , row#,  multiple,  +/-,  row# multiple" + cr;
// 		for (var i = 1; i <= stackPtr; i++)
// 			{
// 			str += operationsStack[i] + cr;
// 			}
// 		document.theSpreadsheet.output.value = str;
// 		} // of this option
			
// 	// Option 7 Row Swap
// 	else if (num == 7)
// 		{
// 		readMatrix();
// 		var pst = document.theSpreadsheet.p.value;
// 		var qst = document.theSpreadsheet.q.value;
// 		if (!looksLikeANumber(pst) ||  !looksLikeANumber(qst) ) 
// 			{
// 			okToRoll = false;
// 			document.theSpreadsheet.expr.value = "You must first enter row numbers in both fields."
// 			}
// 		var p = eval(pst);
// 		var q = eval(qst);
// 		if (okToRoll)
// 			{
// 			if ( (p < 0) || (p > numRows) || (Math.round(p) != p))
// 				{
// 				okToRoll = false;
// 				document.theSpreadsheet.expr.value = "Row "+p+" is not a valid row number."
// 				}
// 			else if ( (q < 0) || (q > numRows) || (Math.round(q) != q))
// 				{
// 				okToRoll = false;
// 				document.theSpreadsheet.expr.value = "Row "+j+" is not a valid row number."
// 				}
// 			} // end of this round of tests

// 		if (okToRoll)
// 			{
// 			swapRows(theMatrix,p,q);
// 			displayMatrix();
// 			} // of okToRoll
// 		okToRoll = true;	// reset

// 		} // end of option 7

// 		// Option 8 Row Reduce
// 	else if (num == 8)
// 		{
// 		readMatrix();
// 		rowReduce();
// 		displayMatrix();
// 		document.theSpreadsheet.expr.value = "The matrix is reduced."
// 		} // end of Option 8

		
// 	else if (num == 9){//paste
// 		x = activeX;
// 		y = activeY;
// 		//alert("You want to paste from " + x + " , " + y +"?");
// 		var theStr = document.theSpreadsheet1[(x-1)*maxCols + y-1].value;
// 		//alert("I read the data.");
// 		//if(theStr.search(/[\r\t]/)==-1) {alert("Bad data");return false;}
// 		//else {
// 			// some fixing up for spaces arond signs
// 			theStr=theStr.replace(/( )([\+\-\/\*])( )/g,"$2");
// 			var rowArr=theStr.split(" ");
// 			var nr=rowArr.length;
// 			for (var i=0;i<nr;i++) {
// 				var colArr=rowArr[i].split("\t");
// 				for (var j=0;j<colArr.length;j++){
// 					//alert("So far so good, want to write " + colArr[j]);
// 					//document.theSpreadsheet.expr.value = colArr[j];
// 					document.theSpreadsheet1[maxCols*(x+i-1) + y+ j-1].value=colArr[j];
// 				}
// 			}		
// 		//}
// 	}
// 	else if(num ==10){//select a submatrix
// 		//alert("You want to select a submatrix?");
// 		x = activeX;
// 		y = activeY;
// 		//document.theSpreadsheet.expr.value = "selected " + submatrixSelectionStage + " " + x + " " + y;
		
// 		if(submatrixSelectionStage ==0){
// 			submat11 = x;
// 			submat12 = y;	
// 			document.theSpreadsheet1[(submat11-1)*maxCols + submat12-1].style= "background-color:orange";
// 			submatrixSelectionStage = 1;
// 			document.theSpreadsheet.expr.value = "Select the opposite corner and press Submatrix again.";
// 			return;
// 		}
// 		if(submatrixSelectionStage == 1){
// 			submat21 = x;
// 			submat22 = y;	
// 			//document.theSpreadsheet.expr.value = "selected " + submatrixSelectionStage + " " + submat11 + " " + submat12 + " to " + x + " " + y;
// 			dataBlock = "";
// 			for(var i = submat11; i <= x; i++){
// 				for(var j = submat12; j<= y; j++){
// 					//alert("i , j = " + i + " " + j + " " + dataBlock);
// 					var val = document.theSpreadsheet1[(i-1)*maxCols + j-1].value;
// 					dataBlock += val + ( (j==y)?"":"\t");
// 					//f(j< y) dataBlock += "\t";
// 					//else dataBlock += "\n";
// 					document.theSpreadsheet1[(i-1)*maxCols + j-1].style="background-color:orange";
// 				}
// 				dataBlock += ((i==x)?"":"\n");
// 			}
// 			document.getElementById("datapaste").value=dataBlock;
// 			document.getElementById("datapaste").select();
// 			document.theSpreadsheet.expr.value = "Press Ctrl-C to copy and then Submatrix to clear the selection.";

// 			submatrixSelectionStage = 3;
// 			return;
// 		}
// 		if(submatrixSelectionStage ==3){
// 			for(var i = submat11; i <= submat21; i++){
// 				for(var j = submat12; j<= submat22; j++){
// 					document.theSpreadsheet1[(i-1)*maxCols + j-1].style="background-color:white";
// 				}
// 			}
// 			submatrixSelectionStage = 0;
// 			return;
// 		}
		
// 	}
// 	//Options 101 to 100+maxCols Compute Theta Ratios
// 	else if (1 <= num - 100  <= maxCols )
// 		{
// 		var pivCol = num - 100;
// 		//document.theSpreadsheet.expr.value = "column number " + pivcol.toString();
// 		readMatrix();
// 		//alert("YO " + numRows);
// 		//document.theSpreadsheet.expr.value = "numRows = " + numRows;
// 		verifyPivots();
// 		if(condensed) pivCol += numRows;
// 		var minRatio = -1;
// 		var ratio;
// 		//alert("Ratios for column " +  pivcol + " theBasis: " + theBasis[0] + theBasis[1] + theBasis[3] );
// 		for( i = 1; i<= maxRows; i++){
// 			//document.theSpreadsheet.expr.value = i;
// 			b = theMatrix[i][numCols];
// 			a = theMatrix[i][pivCol];
// 			//alert("iteration " + i);
// 			if( a > 0 && b >= 0){
// 				ratio = b/a;
// 				//alert("a, b, ratio = " + a + b + ratio);
// 				if(minRatio == -1) {minRatio = ratio;
// 				//alert("a, b, ratio, min = " + a + b + ratio + minRatio);
// 				}
// 				else { //alert("about to modify minRatio. ratio, minRatio = " + ratio + " " + minRatio);
// 					if(minRatio > ratio ) minRatio = ratio;
// 					//alert("...modified");
// 					}
// 				}
// 			else {ratio = "";}
// 			document.lpstuff[2*i - 1].value = ratio;
// 		}
// 		for( i = 1; i<= maxRows; i++){
// 			b = theMatrix[i][numCols];
// 			a = theMatrix[i][pivCol];
			
// 			if( a > 0 && b >=0){
// 				//if(i >numRows){
// 					//alert("row " + i + "a = " + a + "b= " + b);
// 				//}
// 				ratio = b/a;
// 				if(ratio == minRatio) document.lpstuff[2*i -1].style="background-color:FFFFFF";
// 				else document.lpstuff[2*i -1].style="background-color:DDDDDD";
// 			}
// 			else document.lpstuff[2*i -1].style="background-color:DDDDDD";	
// 		}//for
// 		}// end of Options 101 to 100+maxCols*/

// } // end of doIt


/*
function sayMore(s){
    document.controls.output.value += " " + s;
}*/

/*
 function showRatios(){
	doIt(100 + activeY);
}
*/

// function readMatrix() {
//     // reads the current Matrix
//     theX = activeX;
    
//     if ((!fractionMode) && (!integerMode)) doIt(2);		// rounding information
    
//     unDoSteps = 0;		// no steps left to undo
//     firstBackUp = true;		// have broken a possible chain of backups
//     var count = 0;
//     // first detect the size of the active Matrix
//     var theRowSize = 0;
//     var theColSize = 0;
        
//     for (var i = 1; i <= maxRows; i++)
//         {
//         for (var j = 1; j <= maxCols; j++)
//             {
//             theMatrix[i][j] = 0;
//             var theString = stripSpaces(document.theSpreadsheet1[count].value);
//             theString=stripChar(theString,",");
//             if (theString == "")
//                 {
//                 }
//             else 
//                 {
//                 if (theRowSize<i) theRowSize = i;
//                 if (theColSize < j) theColSize = j;
//                 }
//             count++;
//             } // j
//         } // i
    
//     numRows = theRowSize; 			// reset globals here
//     numCols = theColSize; 			// reset globals here
//     //alert("read matrix, numRows = " + numRows);
//     //alert("Read matrix, " + theMatrix[numRows+1][1] + " " + theMatrix[numRows+1][2] + " " + theMatrix[numRows+1][3] + " " + theMatrix[numRows+1][4] + " " +  theMatrix[numRows+1][5] );
//     //displayed positions of theMatrix columns
//       for( var i = 1; i <= numCols; i++)
//         if(condensed) {colMap[i] = numRows + i;  the.colMap[numRows + i] = i;} //put basic variables first
//         else colMap[i] = i; //no remapping of columns
                                                   
//     theY = colMap[activeY];
//     count = 0;
//     for (i = 1; i <= maxRows; i++)
//         {
//         for (j = 1; j <= maxCols; j++)
//             {
//             if((theRowSize>=i) && (theColSize >= j)){
//                 theString = stripSpaces(document.theSpreadsheet1[count].value);
//                 theString=stripChar(theString,",");
//                 if (theString == ""){
//                     theMatrix[i][colMap[j]] = 0;
//                     document.theSpreadsheet1[count].value = "0";
//                 }
//                 else{
//                     theMatrix[i][colMap[ j] ] = eval(theString);
//                 }
//             }
//             // starts numbering at 0
//             count++; 
//             } // j
//         } // i
      
//     //augment with an identity matrix on the left if in condensed mode
//     if(condensed)
//       for(var j = 1; j <= numRows; j++)
//           for(var i = 1; i <=numRows; i++)
//             if( i == j) theMatrix[i][j] = 1;
//             else theMatrix[i][j] = 0;
     
//     // read variable labels from the column headers
//      for (var j = 1; j<= theColSize; j++)
//         { 
//             theString = stripSpaces(document.labels[j-1].value);
//             theString = stripChar(theString,",");
//             //if( theString == "")
//             //	{ theString = "x" + j.toString();}
//             theLabels[colMap[j]] = theString;
//         }
//     // read variable labels from the rows if condensed
//      if(condensed)
//      {// read variable labels from the rows if condensed
//         for (var i = 1; i<= theRowSize; i++)
//          {
//            theString = stripSpaces(document.lpstuff[2*(i-1)].value);
//            theString = stripChar(theString,",");
//            //if( theString == "")
//             // { theString = "y"  + i.toString();}
//            theRowLabels[i] = theString;
//            theLabels[i] = theString;
//          }
//         //set the pivot locations in theBasis
//            for(var i = 0; i <= numRows; i++){
//             theBasis[i] = i;}
//         numCols = numRows + numCols; 	 
//     }
    
//     // save this if they want it
//     if (saveThis)
//         {
//         saveThis = false;
//         for (i = 1; i <= maxRows; i++)
//         {
//         for (j = 1; j <= maxCols; j++)
//             {
//             theSavedMatrix[i][j] = theMatrix[i][j];
//             } // j
//         } // i
//         //save pivots
//         for(i = 1; i <= maxRows; i++){
//             theSavedBasis[i] = theBasis[i];
//         }
//         //save labels
//         for(i = 1; i <=maxCols; i++){
//             theSavedLabels[i] = theLabels[i];
//         }
//         //save type of tableau
//         savedCondensed = condensed;
//         } 
//         //save colMap
//         for(i = 1; i <= numCols; i++) savedColMap[i] = colMap[i];
//         //save row /col nums
//         savedNumRows = numRows;
//         savedNumCols = numCols;
    
//     // save the settings
//     backSteps++;
//     if (backSteps > maxBackSteps) backSteps = maxBackSteps;
//     backupPosition++;
//     if (backupPosition > maxBackSteps) backupPosition = 1;
//     if (fractionMode) theBackStatus[backupPosition] = "F";
//     else if (integerMode) theBackStatus[backupPosition] = "I";
//     else theBackStatus[backupPosition] = "D"
//     // alert (theBackStatus[backupPosition])
//     for (i = 1; i <= maxRows; i++)
//         {
//         for (j = 1; j <= maxCols; j++)
//             {
//             theBackMatrix[i][j][backupPosition] = theMatrix[i][j];
//             } // j
//         } // i
//     // lastly, reset the mode
//     fractionMode = false;
//     integerMode = false;
//     var theMode = document.theSpreadsheet.Mode.selectedIndex;
//     // alert(document.theSpreadsheet.Mode.selectedIndex);
//     if (document.theSpreadsheet.Mode.options[theMode].text == "Fraction") fractionMode = true;
//     else if (document.theSpreadsheet.Mode.options[theMode].text == "Integer") integerMode = true;
//     // alert("fractionMode = " + fractionMode + "integerMode = " + integerMode);
    
//     // *** testing *******
//     // var str = "x selected = "+activeX + "  y selected = " + activeY + cr;
//     // document.theSpreadsheet.output.value = "";
//     // for (var i = 1; i <= numRows; i++)
//     //	{
//     //	for (var j = 1; j <= numCols; j++)
//     //		{
//     //		 str += theMatrix[i][j] + tab;
//     //		}
//     //	str += cr;
//     //	}
//     // document.theSpreadsheet.output.value = str;
//     //  alert ("here");
//     // *** testing *******
    
    
//     } // readMatrix

/*function FracScaleRowFrac(mat, cols, row, fact){
    for(var j = 0; j < cols; j++){
        mat[row][j] = fracmul(mat[row][j],fact);
    }
}*/