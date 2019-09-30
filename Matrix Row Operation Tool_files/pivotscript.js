// ** COPYRIGHT (c) 2004 STEFAN WANER **
// ****************** ALL RIGHTS RESERVED *******************

// *** ERROR HANDLING
window.onerror = myErrorTrap;

// var exit = false; // get out of here
var okToRoll = true;		// preliminary testing results
var doNotReduce = true;	// automatic reduction in integer mode is off by default
var stepName = "";		// for error trap
var tab = unescape( "%09" );	// these are now the appropriate strings;
var cr = unescape( "%0D" );	
var activeX = 1;		// activated cell coords
var activeY = 1;
var prevX = 0;			// previously active cell
varPrevY = 0;
var comma = ",";
var singular = false;
var maxRows = 15;
var maxCols = 15;
var numRows =1;
var numCols = 1;
var cellPosition = 0;		// active cell in the spreadsheet
var PrevCellPosition = 0;	// previously active cell position
var lineSkip = false;		// skip line on tab
var backSteps = 0;		// how many steps you can back up at any given point
var backupPosition = 1;	// cycles 1-5
var maxBackSteps = 5;	// fixed at 5;
var reDoFlag = false;		// cannot redo unless you back up
var firstBackUp = true;	// first backup must do an extra save
var stackSize = 0;		// the size of the row operations stack not yet implemented
var unDoSteps = 0;		// number of successive undos

var operationsStack = new Array();		// the row operations stack not yet implemented
				// stack location = stackSize
				// format of each cell = string  | y , R# , mult ,  +/- ,  R# ,  mutl |
				// or 				Int to Frac Switch
				// y = 1: a single row op  y = 0, part of a chain of row ops
				// as in a pivot op or a complete reduction
				// this cylces back to top after 100 operations
var stackPtr = 0;
var theMatrix = new makeArray2(maxRows,maxCols); 
				// we will only work with submatrix numRows x numCols
var theSavedMatrix = new makeArray2(maxRows,maxCols); 	// to revert to saved matrix
var theFistBackupMatrix = new makeArray2(maxRows,maxCols); 	// saves latest operation
var theBackMatrix = new makeArray3(maxRows,maxCols, maxBackSteps);
var theBackStatus = new Array();
var saveThis = true;
var theBasis = new makeArray(maxRows); //basic variables
for(var i = 0; i < maxRows; i++) theBasis[i] = 0;
var theLabels = new makeArray(maxCols); //variable labels
var numSigDigs = 6;					// default accuracy
var theSmallestNumber = 0.000000000001	// everything smaller is set to zero

// old globals below...

var maxDenom = 10000;  // for fraction approximation
var tol = .000000001; // for 10 digit accuracy guaranteed cutoff for fractin approx not yet implemented
var tooBigString = "Too many matrices in your expression," + cr + "or your expression is too complicated." + cr +"Please keep it simple!"

var fractionMode = false;
var integerMode = false;
var okToRoll = true;
var browserName = navigator.appName;
var browserVersion = navigator.appVersion;
if ( (browserName == "Netscape") && (parseInt(browserVersion) >= 3)) browserName = "N";
else if ( (browserName == "Microsoft Internet Explorer") && (parseInt(browserVersion) >= 3) ) browserName = "M";

// ****************** ERROR HANDLER *************
function myErrorTrap(message,url,linenumber) {
alert("I'm sorry, B. I can't do that.");
return (true);
} // end of on error

// ******************** MATH UTILITIES ******************
function hcf (a,b) {

if ( (a == 0) && (b == 0) ) return(0); // actually should be infinity
var bigger = Math.abs(a);
var smaller = Math.abs(b);
var x = 0;
var theResult = 1; 
if (a == b) return(bigger);

if (smaller > bigger) {x = bigger; bigger = smaller;  smaller = x}
if (smaller == 0) return(bigger);

var testRatio = roundSigDig(bigger/smaller, 11);
var testRatio2 = 0;
if (testRatio == Math.floor(testRatio) ) return (smaller)
else
	{
	// look for a factor of the smaller, deplete it by that factor and multiply bigger by it
	var found = false;
	var upperlimit = smaller;
	for (var i = upperlimit; i >= 2; i--)
		{
		testRatio = roundSigDig(smaller/i, 10);
		testRatio2 = roundSigDig(bigger/i, 10);

		if  ( (testRatio == Math.floor(testRatio) ) && (testRatio2 == Math.floor(testRatio2) ) )
			{

			smaller = Math.round(smaller/i);
			bigger = Math.round(bigger/i);
			theResult = i* hcf(bigger, smaller)
			return(theResult);
			}
		}
		return(theResult);
		}
alert("error!");
return(-1); // should never get here
} // hcf


function lcm(a,b) {
// lowest common multiple
var bigger = Math.abs(a);
var smaller = Math.abs(b);
var x = 0;
if ( (a == 0) || (b == 0) ) return(1);
if (smaller > bigger) {x = bigger; bigger = smaller;  smaller = x}

var testRatio = roundSigDig(bigger/smaller, 11)
if (testRatio == Math.floor(testRatio) ) return (bigger)
else
	{
	// look for a factor of the smaller, deplete it by that factor and multiply bigger by it
	var found = false;
	for (var i = 2; i <= smaller; i++)
		{
		if (i*i >= smaller) break;
		testRatio = roundSigDig(smaller/i, 11);
		if (testRatio == Math.floor(testRatio) )
			{
			smaller = testRatio;
			bigger = bigger*i;
			return( lcm(bigger, smaller) );
			}
		}
		return(bigger*smaller);
		}
alert("error!");
return(-1); // should never get here
} // lcm

// *** reducing a fraction ***
function reduce(fraction){
with (Math)
	{
	var HCF = hcf(fraction[1], fraction[2]);
	fraction[1] = Math.round(fraction[1]/HCF);
	fraction[2] = Math.round(fraction[2]/HCF);
	} // with math
return(fraction);
} // reduce fraction


function toFracArr(x, maxDenom, tol) {
// identical to toFrac, except this returns an array [1] = numerator;  [2] = denom 
// rather than a string
// tolerance is the largest errror you will tolerate before resorting to 
// expressing the result as the input decimal in fraction form
// suggest no less than 10^-10, since we round all to 15 decimal places.
	var theFrac = new Array();
	theFrac[1] = 0;
	theFrac[2] = 0;
	var p1 = 1;
	var p2 = 0;
	var q1 = 0;	
	var q2 = 1;	
	var u =0;
	var t = 0;
	var flag = true;
	var negflag = false;
	var a = 0;
	var xIn = x; // variable for later
	var n = 0;
	var d = 0;
	var p = 0;
	var q = 0;

	if (x >10000000000) return(theFrac);
while (flag)
	{
	if (x<0) {x = -x; negflag = true; p1 = -p1}
	var intPart = Math.floor(x);
	var decimalPart = roundSigDig((x - intPart),15);

	x = decimalPart;
	a = intPart;
	
	t = a*p1 + p2;
	u = a*q1 + q2;
	if  ( (Math.abs(t) > 10000000000 ) || (u > maxDenom ) ) 
		{
			n = p1;
			d = q1;
			break;
		}

		p = t;
		q = u;
			
//		cout << "cf coeff: " << a << endl; // for debugging
//		cout << p << "/" << q << endl;	// for debugging
		
	if ( x == 0 )
		{
		n = p;
		d = q;
		break;
		}

		p2 = p1;
		p1 = p;
		q2 = q1;
		q1 = q;
		x = 1/x;
	
	} // while ( true );
	
	theFrac[1] = n;
	theFrac[2] = d;
	return(theFrac);

} // toFracArr

function toFrac(x, maxDenom, tol) {
// tolerance is the largest errror you will tolerate before resorting to 
// expressing the result as the input decimal in fraction form
// suggest no less than 10^-10, since we round all to 15 decimal places.
	var theFrac = new Array();
	theFrac[1] = 0;
	theFrac[2] = 0;
	var p1 = 1;
	var p2 = 0;
	var q1 = 0;	
	var q2 = 1;	
	var u =0;
	var t = 0;
	var flag = true;
	var negflag = false;
	var a = 0;
	var xIn = x; // variable for later
	var n = 0;
	var d = 0;
	var p = 0;
	var q = 0;

	if (x >10000000000) return(theFrac);
while (flag)
	{
	if (x<0) {x = -x; negflag = true; p1 = -p1}
	var intPart = Math.floor(x);
	var decimalPart = roundSigDig((x - intPart),15);

	x = decimalPart;
	a = intPart;
	
	t = a*p1 + p2;
	u = a*q1 + q2;
	if  ( (Math.abs(t) > 10000000000 ) || (u > maxDenom ) ) 
		{
			n = p1;
			d = q1;
			break;
		}

		p = t;
		q = u;
			
//		cout << "cf coeff: " << a << endl; // for debugging
//		cout << p << "/" << q << endl;	// for debugging
		
	if ( x == 0 )
		{
		n = p;
		d = q;
		break;
		}

		p2 = p1;
		p1 = p;
		q2 = q1;
		q1 = q;
		x = 1/x;
	
	} // while ( true );
	
	theFrac[1] = n;
	theFrac[2] = d;

	if (theFrac[2] == 1) return (theFrac[1].toString());
	else return (theFrac[1] + "/" + theFrac[2]);

} // toFrac


function lastChar(theString) {
if (theString == "") return(theString);
var len = theString.length;
return theString.charAt(len-1); 
}

function looksLikeANumber(theString) {
// returns true if theString looks like it can be evaluated
var result = true;
var length = theString.length;
if (length == 0) return (false);
var x = ""
var y = "1234567890-+*. /"
var yLength = y.length;
for (var i = 0; i <= length; i++)
	{ 
	x = theString.charAt(i);
		result = false;
		for (var j = 0; j <= yLength; j++) 
			{
			if (x == y.charAt(j)) {result = true; break}
			} // j
	if (result == false) return(false);
	} // i
return(result);
} // looks like a number

function roundSix(theNumber) {
var x = (Math.round(1000000*theNumber))/1000000;
return(x);
}

function shiftRight(theNumber, k) {
	if (k == 0) return (theNumber)
	else
		{
		var k2 = 1;
		var num = k;
		if (num < 0) num = -num;
		for (var i = 1; i <= num; i++)
			{
			k2 = k2*10
			}
		}
	if (k>0) 
		{return(k2*theNumber)}
	else 
		{return(theNumber/k2)}
	}

function roundSigDig(theNumber, numDigits) {
		numDigits = numDigits -1		// too accurate as written
	with (Math)
		{
		if (theNumber == 0) return(0);
		else if(abs(theNumber) < theSmallestNumber) return(0);
// WARNING: ignores numbers less than 10^(-12)
		else
			{
			var k = floor(log(abs(theNumber))/log(10))-numDigits
			var k2 = shiftRight(round(shiftRight(abs(theNumber),-k)),k)
			if (theNumber > 0) return(k2);
			else return(-k2)
			} // end else
		}
	}


function looksLikeANumber(theString) {
// returns true if theString looks like it can be evaluated
var result = true;
var length = theString.length;
var x = ""
var y = "1234567890-+^*./ "
var yLength = y.length;
for (var i = 0; i <= length; i++)
	{ 
	x = theString.charAt(i);
		result = false;
		for (var j = 0; j <= yLength; j++) 
			{
			if (x == y.charAt(j)) {result = true; break}
			} // j
	if (result == false) return(false);
	} // i
return(result);
} // looks like a number

// ************ MAKE INTEGER
// Makes a matrix integer by least common multiples of rows
// returms a matrix of STRINGS if Strings = true else gives integers
// input = a matrix of real floats


function makeInteger(theMatrix, RowNum, ColNum,Strings) {
var rowArray = new makeArray2(ColNum,2);
var outArray = new makeArray2(maxRows,maxCols);
for (var i = 1; i <= RowNum; i++)
	{
	// set up fraction row array
	for (var j = 1; j <= ColNum; j++) 
		{
		for (var k = 1; k <= 2; k++) rowArray[j][k] = toFracArr(theMatrix[i][j],maxDenom, tol)[k];
		} // j
	
	// get the lcm of all the row denominators
	var rowLcm = 1; 
	
	for (j = 1; j <= ColNum; j++) rowLcm = lcm(rowLcm,rowArray[j][2]);
	// now multiply the row by the lcm
	for  (j = 1; j <= ColNum; j++) 
		{
		rowArray[j][1] = rowLcm*rowArray[j][1]/rowArray[j][2];
		// now ignore [2] entry from here on
		}
	// undo information follows
	stackPtr++;
	if(stackPtr == 101) stackPtr = 1;
	operationsStack[stackPtr] = "0,"+ i + "," + (1/rowLcm).toString();
	// starts with 1 to mark first step in a sequence
	
// now get the hcf of the integers in the row
if(!doNotReduce)
	{
	var rowHcf = 0;

	for (j = 1; j <= ColNum; j++) rowHcf = hcf(rowHcf,rowArray[j][1]);
	if (rowHcf != 0)
		{
		// now divide the row by the hcf
		for  (j = 1; j <= ColNum; j++) 
			{
			rowArray[j][1] = rowArray[j][1]/rowHcf;
			}
		} // if row Hcf
	} // if reducing

	// prepare output array
	var x = 0;
	for  (j = 1; j <= ColNum; j++) 
		{ 
		x = rowArray[j][1]
		if (!Strings) outArray[i][j] = Math.round(x);
		else outArray[i][j] = Math.round(x).toString();
	//	else outArray[i][j] = x.toString();
		} // j

	} // i
return(outArray);

} // makeInteger
// *************END MAKE INTEGER ***************

// ***********ROW REDUCE *********************
function rowReduce() {

var theNum;
for (var i = 1; i <= numRows; i++)
	{ 
	var theCol = 0;
	// search for the leading entry in the ith row
	for (var j = 1; j <= numCols; j++)
		{
		theNum = theMatrix[i][j];
		if (Math.abs(theNum) < theSmallestNumber) theMatrix[i][j] = 0;
		else {theCol = j; break}
		} // j
	if (theCol != 0) pivot(theMatrix,numRows,numCols,i,theCol);
	} // i
// Now arrange the pivoted rows by leading entries
// search the columns from left
var theRow = 1;
for (j = 1; j <= numCols; j++)
	{
	for (i = theRow; i <= numRows; i++)
		{
		if( theMatrix[i][j] != 0) 
			{
			if (i == theRow) {theRow++; break;}
			else { swapRows(theMatrix,theRow,i); theRow++; break}
			} // found non-zero
		} // i
	} // j
} // rowReduce

// ***********END ROW REDUCE ***************

// *******************PIVOT **********************
function pivot(InMatrix,rows,cols,theRow,theCol) {
// alert("theRow = " + theRow + "theCol" + theCol);
var thePivot = InMatrix[theRow][theCol];
doNotReduce = false;		// turns on automatic reduction
for (var i = 1; i <= cols; i++)
	{
	InMatrix[theRow][i] = InMatrix[theRow][i]/thePivot;
	} // i
	// undo information follows
	stackPtr++;
	if(stackPtr == 101) stackPtr = 1;
	operationsStack[stackPtr] = "1,"+theRow.toString() + ","+thePivot.toString() 	
	// starts with 1 to mark the first step in a sequence
// now pivot
var theNum = 1;
for (var i = 1; i <= rows; i++)
	{
	if ( (i != theRow) && (InMatrix[i][theCol] != 0) )
		{
		var factr = InMatrix[i][theCol];

		for (var j = 1; j <= cols; j++)
			{ 

			InMatrix[i][j] = InMatrix[i][j] - factr*InMatrix[theRow][j];

			} // j
			// undo information follows
			stackPtr++;
			if(stackPtr == 101) stackPtr = 1;

			operationsStack[stackPtr] = "0," + i + ",1,+," + theRow + "," + factr.toString();
			// starts with 0 to mark subsequent steps in a sequence
		}
	} // i
 

return(InMatrix);
}

// ***************** END PIVOT *********************

// *************DIVIDE ROW BY SELECTION ************
function divideRowbySelection(InMatrix,rows,cols,theRow,theCol) {
// if it is in integer mode and division results in fractions, switches to fraction mode

var theNumber = theMatrix[activeX][activeY];
var integerFlag = true;
var num = 1;
// it should not be zero at this point...
for (var i = 1; i <= cols; i++)
	{
	num= InMatrix[theRow][i]/theNumber;
	InMatrix[theRow][i] = num;
	if ( (integerFlag)&&(Math.round(num) != num) ) integerFlag = false;
	} // i
	// undo information follows
	stackPtr++;
	if(stackPtr == 101) stackPtr = 1;
	operationsStack[stackPtr] = "1," + theRow + "," +theNumber.toString();
	// starts with 1 to mark first step in a sequence

if ( (integerMode) && (!integerFlag)) 
	{
	integerMode = false;
	fractionMode = true;
	document.theSpreadsheet.Mode.options[1].selected = true;
	// undo Information
	stackPtr++;
	if(stackPtr == 101) stackPtr = 1;
	operationsStack[stackPtr] = "Int to Frac Switch"
	// end undo information
	} // if integer mode
return(InMatrix);
} // divide row by selection
// **********END DIVIDE ROW BY SELECTION **********

// ************ ROW OPERATION ********************
function rowOp(theMatrix, theRow, theOtherRow, a, b) {
// replaces theRow by a*theRow + b*theOtherRow & puts it in resultRow
// alert("here a = "+a);
var integerFlag = true;
var num = 1;
for (var j = 1; j <= numCols; j++)
	{
	if (theOtherRow != 0) num = a*theMatrix[theRow][j] + b*theMatrix[theOtherRow][j];
	else num = a*theMatrix[theRow][j];
	theMatrix[theRow][j] = num;
	if ( (integerFlag)&&(Math.round(num) != num) ) integerFlag = false;
	} // j
// undo information follows
stackPtr++;
if(stackPtr == 101) stackPtr = 1;
operationsStack[stackPtr] = "1," + theRow + "," +a.toString() + ",-," + theOtherRow + "," + b.toString();
// starts with 1 to mark first step in a sequence
if ( (integerMode) && (!integerFlag)) 
	{
	integerMode = false;
	fractionMode = true;
	document.theSpreadsheet.Mode.options[1].selected = true;
	// undo Information
	stackPtr++;
	if(stackPtr == 101) stackPtr = 1;
	operationsStack[stackPtr] = "Int to Frac Switch"
	// end undo information
	} // if integer mode
return(theMatrix);
} // rowOp
// ********END ROW OPERATIION ********************

// ***********SWAP ROWS *************************
function swapRows(InMatrix,p,q) {
var rowHold =0;
for(var j = 1; j <= numCols; j++)
	{
	rowHold = InMatrix[p][j];
	InMatrix[p][j] = InMatrix[q][j];
	InMatrix[q][j] = rowHold;
	} // j
// undo Information
stackPtr++;
if(stackPtr == 101) stackPtr = 1;
operationsStack[stackPtr] = "Swap,"+ p + "," + q;
// end undo information
return(InMatrix);
} // end swap rows
// ********END SWAP ROWS ************************



// *************** FORM UTILITIES ******************

// **** sesame *****************
function sesame(url,hsize,vsize){ 
// Default size is 550 x 400
        var tb="toolbar=0,directories=0,status=0,menubar=0"
        tb+=",scrollbars=1,resizable=1,"
    var tbend="width="+hsize+",height="+vsize;
    if(tbend.indexOf("<undefined>")!=-1){tbend="width=550,height=400"}
      tb+=tbend
     	Win_1 = window.open("","win1",tb);
      Win_1 = window.open(url,"win1",tb);
	Win_1.focus();
    }
// ***************************

// ********ACTIVE CELL CHECK*********
function checkIn() {
lineSkip = false
prevX = activeX;
prevY = activeY; 
prevCellPosition = cellPosition;
activeX = checkIn.arguments[0];
activeY = checkIn.arguments[1];
if ( ( browserName == "N") || ( browserName == "M") )
{
cellPosition = (activeX-1)*maxCols + activeY-1;
if (prevCellPosition + 1 == cellPosition) 
	{
	// looks like you tabbed there
	lineSkip = true;
	}
if ( (lineSkip) && (document.theSpreadsheet1[prevCellPosition].value == "" ) && (activeX < maxRows))
	{
//	document.theSpreadsheet1[cellPosition].blur();
	var posn = cellPosition + maxCols - activeY+1; 
// alert(posn);
	document.theSpreadsheet1[posn].focus();
	document.theSpreadsheet1[posn].select();
// alert(posn);

	}

} // if Netscape
return(true);
} // checkIn
// ******END ACTIVE CELL CHeCK ******

// ********TAB-ING HANDLE BLUR *****
function handleBlur() {

return(true);
} // handleBlur
// ********END HANDLE BLUR *********

// *************READ THE MATRIX********************
function readMatrix() {
// reads the current Matrix

if ((!fractionMode) && (!integerMode)) doIt(2);		// rounding information

unDoSteps = 0;		// no steps left to undo
firstBackUp = true;		// have broken a possible chain of backups
var count = 0;
// first detect the size of the active Matrix
var theRowSize = 0;
var theColSize = 0;
	
for (var i = 1; i <= maxRows; i++)
	{
	for (var j = 1; j <= maxCols; j++)
		{
		var theString = stripSpaces(document.theSpreadsheet1[count].value);
		theString=stripChar(theString,",");
		if (theString == "")
			{
			}
		else 
			{
			if (theRowSize<i) theRowSize = i;
			if (theColSize < j) theColSize = j;
			}
		count++;
		} // j
	} // i

numRows = theRowSize; 			// reset globals here
numCols = theColSize; 			// reset globals here
count = 0;
for (i = 1; i <= maxRows; i++)
	{
	for (j = 1; j <= maxCols; j++)
		{
		theString = stripSpaces(document.theSpreadsheet1[count].value);
		theString=stripChar(theString,",");
		if (theString == "")
			{
			theMatrix[i][j] = 0;
			if ( (theRowSize>=i) && (theColSize >= j) ) document.theSpreadsheet1[count].value = "0";
			}
		else
			{
			theMatrix[i][j] = eval(theString);
			}
		// starts numbering at 0
		count++; 
		} // j
	} // i
// read variable labels
 for (j = 1; j<= theColSize; j++)
	{ 
		theString = stripSpaces(document.labels[j-1].value);
		theString = stripChar(theString,",");
		if( theString == "")
			{ theString = j.toString();}
		theLabels[j] = theString;

	} 
// save this if they want it
if (saveThis)
	{
	saveThis = false;
	for (i = 1; i <= maxRows; i++)
	{
	for (j = 1; j <= maxCols; j++)
		{
		theSavedMatrix[i][j] = theMatrix[i][j];
		} // j
	} // i
	
	} // if save this


// save the settings
backSteps++;
if (backSteps > maxBackSteps) backSteps = maxBackSteps;
backupPosition++;
if (backupPosition > maxBackSteps) backupPosition = 1;
if (fractionMode) theBackStatus[backupPosition] = "F";
else if (integerMode) theBackStatus[backupPosition] = "I";
else theBackStatus[backupPosition] = "D"
// alert (theBackStatus[backupPosition])
for (i = 1; i <= maxRows; i++)
	{
	for (j = 1; j <= maxCols; j++)
		{
		theBackMatrix[i][j][backupPosition] = theMatrix[i][j];
		} // j
	} // i
// lastly, reset the mode
fractionMode = false;
integerMode = false;
var theMode = document.theSpreadsheet.Mode.selectedIndex;
// alert(document.theSpreadsheet.Mode.selectedIndex);
if (document.theSpreadsheet.Mode.options[theMode].text == "Fraction") fractionMode = true;
else if (document.theSpreadsheet.Mode.options[theMode].text == "Integer") integerMode = true;
// alert("fractionMode = " + fractionMode + "integerMode = " + integerMode);

// *** testing *******
// var str = "x selected = "+activeX + "  y selected = " + activeY + cr;
// document.theSpreadsheet.output.value = "";
// for (var i = 1; i <= numRows; i++)
//	{
//	for (var j = 1; j <= numCols; j++)
//		{
//		 str += theMatrix[i][j] + tab;
//		}
//	str += cr;
//	}
// document.theSpreadsheet.output.value = str;
//  alert ("here");
// *** testing *******


} // readMatrix

 // ******* END READ MATRIX *********

// *******BACKUP ******************
function backUp() {

if(firstBackUp)
	{
	for (var i = 1; i <= numRows; i++)
		{
		for (var j = 1; j <= numCols; j++)
			{
			theFistBackupMatrix[i][j] = theMatrix[i][j];
			} // j
		} // i

// alert("here " + theFistBackupMatrix[2][1]);
	firstBackUp = false;
	}

document.theSpreadsheet.expr.value = ""
if (backSteps == 0) {document.theSpreadsheet.expr.value = "Sorry. You have backed up as far as you can go..."; return(false)}
if (theBackStatus[backupPosition] == "F") {fractionMode = true; integerMode = false; document.theSpreadsheet.Mode.options[1].selected = true;}
else if (theBackStatus[backupPosition] == "I") {fractionMode = false; integerMode = true; document.theSpreadsheet.Mode.options[2].selected = true;}
else {fractionMode = false; integerMode = false; document.theSpreadsheet.Mode.options[0].selected = true;}
for (var i = 1; i <= maxRows; i++)
	{
	for (var j = 1; j <= maxCols; j++)
		{
		theMatrix[i][j] = theBackMatrix[i][j][backupPosition];
		} // j
	} // i
displayMatrix();
backSteps--;
if (backSteps < 0) backSteps = 0;
backupPosition--;
if (backupPosition == 0) backupPosition = maxBackSteps;
unDoSteps++;
reDoFlag = true;
return(false);
} // backup
// ********END BACKUP ************

// ********REDO ******************
function reDo() {
// alert(unDoSteps);
document.theSpreadsheet.expr.value = ""
if (unDoSteps == 0) {document.theSpreadsheet.expr.value = "Sorry. You cannot redo now"; return(true)}
else if (unDoSteps == 1) 
	{
	readMatrix();
	for (var i = 1; i <= numRows; i++)
		{
		for (var j = 1; j <= numCols; j++)
			{
			theMatrix[i][j] = eval(theFistBackupMatrix [i][j]);
			} // j
		} // i
	displayMatrix(); undoSteps = 0; return(true)
	}

unDoSteps--;

backSteps++;
if (backSteps > maxBackSteps) backSteps = maxBackSteps;
backupPosition++;
if (backupPosition > maxBackSteps) backupPosition = 1;
if(reDoFlag)
	{
	backSteps++;
	if (backSteps > maxBackSteps) backSteps = maxBackSteps;
	backupPosition++;
	if (backupPosition > maxBackSteps) backupPosition = 1;
	reDoFlag = false;
	}

if (theBackStatus[backupPosition] == "F") {fractionMode = true; integerMode = false; document.theSpreadsheet.Mode.options[1].selected = true;}
else if (theBackStatus[backupPosition] == "I") {fractionMode = false; integerMode = true; document.theSpreadsheet.Mode.options[2].selected = true;}
else {fractionMode = false; integerMode = false; document.theSpreadsheet.Mode.options[0].selected = true;}
for (var i = 1; i <= maxRows; i++)
	{
	for (var j = 1; j <= maxCols; j++)
		{
		theMatrix[i][j] = theBackMatrix[i][j][backupPosition];
		} // j
	} // i
displayMatrix();


return(false);
} // backup
// ********END REDO ************

// *******REVERT TO SAVED *********
function Revert() {
for (var i = 1; i <= maxRows; i++)
	{
	for (var j = 1; j <= maxCols; j++)
		{
		theMatrix[i][j] = theSavedMatrix[i][j];
		} // j
	} // i
for (var i = 1; i <= 100; i++) operationsStack[i] = "";
stackPtr = 0;
displayMatrix();
return(true);
	
} // end revert
// ******END OF REVERT ***********

// ****** DISPLAY CURRENT MATRIX ****
function displayMatrix() {

var RowNum = numRows;
var ColNum = numCols;
var x = "";  // a string
// alert("about to display a "+ RowNum+ " x " + ColNum + "matrix");

if (integerMode) 
	{
	theMatrix = makeInteger(theMatrix, numRows, numCols, true)
	var count = 0;
	for (var i = 1; i <= maxRows; i++)
		{
		for (var j = 1; j <= maxCols; j++)
			{
			if ( (i <= numRows) &&  (j <= numCols)) document.theSpreadsheet1[count].value = theMatrix[i][j];
			count++; 
			} // j
		} // i

	} // if integer mode
 // else, handle fractions & decimals
else {
	var count = 0;
	for (var i = 1; i <= maxRows; i++)
		{
		for (var j = 1; j <= maxCols; j++) 		
			{
			if ( (i <= numRows) &&  (j <= numCols))
	 			{
// alert("i = "+i + " j = " + j + "table entry = " + theMatrix[i][j]);
			if (fractionMode) x = toFrac (roundSigDig(theMatrix[i][j],15) , maxDenom, tol);  
			else {x = roundSigDig(theMatrix[i][j], numSigDigs).toString()};

// alert("x = "+x);	
 
			document.theSpreadsheet1[count].value = x;
			} // if ok
			count++;
		} // j 
		
	} // i
	} // end else (if not integer mode)

doNotReduce = true;		// turns off automatic reduction
verifyPivots();
return(0);
}

// ******** END OF DISPLAY ROUTINE ***************



function makeArray3 (X,Y,Z)
	{
	var count;
	this.length = X+1;
	for (var count = 1; count <= X+1; count++)
		// to allow starting at 1
		this[count] = new makeArray2(Y,Z);
	} // makeArray3


function makeArray2 (X,Y)
	{
	var count;
	this.length = X+1;
	for (var count = 0; count <= X+1; count++)
		// to allow starting at 1
		this[count] = new makeArray(Y);
	} // makeArray2

function makeArray (Y)
	{
	var count;
	this.length = Y+1;
	for (var count = 1; count <= Y+1; count++)
		this[count] = 0;
	} // makeArray


function stripSpaces (InString)  {
	OutString="";
	for (Count=0; Count < InString.length; Count++)  {
		TempChar=InString.substring (Count, Count+1);
		if (TempChar!=" ")
			OutString=OutString+TempChar;
		}
	return (OutString);
	}



function rightString(InString, num)  {
	var OutString=InString.substring (InString.length-num, InString.length);
	return (OutString);
}

function leftString(InString, num)  {
	var OutString=InString.substring (0, num);
	return (OutString);
}

function stripChar(InString,symbol)  {
	var OutString="";
	for (Count=0; Count < InString.length; Count++)  {
		TempChar=InString.substring (Count, Count+1);
		if (TempChar!=symbol)
			OutString=OutString+TempChar;
	}
	return (OutString);
}

function replaceSubstring(InString,oldSubstring,newSubstring)  {
	OutString="";
	var sublength = oldSubstring.length;
	for (Count=0; Count < InString.length; Count++)  {
		TempStr=InString.substring (Count, Count+sublength);
		TempChar=InString.substring (Count, Count+1);
		if (TempStr!= oldSubstring)
			OutString=OutString+TempChar
		else 
			{
			OutString=OutString+ newSubstring;
			Count +=sublength-1
			}

	}
	return (OutString);
}

function doRowOps() {
// <form name = "rowops"> names of cells are "r"
okToRoll = true;
var skipThisRow = false;
readMatrix();
var scratchString = "";
var scratchArr = new Array();
for (var ijk = 1; ijk <= numRows; ijk++)
	{
	skipThisRow = false;
	scratchString = stripSpaces(document.rowops[ijk-1].value); 
	if (scratchString == "") skipThisRow = true;
	if (!skipThisRow){
		scratchArr = parseRowOp(scratchString);
		// the values of this array are: 
		// 0: number of rows involved
		// 1: row to change
		// 2: other row used
		// 3: coeff of row to change
		// 4: coeff of other row
			var ast = scratchArr[3];
			var ist = scratchArr[1];
			var bst = scratchArr[4];
			var jst = scratchArr[2];
			if (!looksLikeANumber(ast) ||  !looksLikeANumber(bst) || !looksLikeANumber(ist) || !looksLikeANumber(jst) ) 
				{
				okToRoll = false;
				document.theSpreadsheet.expr.value = "You must first enter numbers in all four fields."
				}

			if (ijk != ist) {
// alert("stopped");
			document.theSpreadsheet.expr.value = "The first-mentioned row must be the changing row. (See the textbook.) I will do nothing.";
			okToRoll = false;  
			}
			var a = eval(ast);
			var b = eval(bst);
			var i = eval(ist);
			if (jst != "") var j = eval(jst);
			else var j= 0;		// for a single multiple
			if (okToRoll) 
				{
				if  (a == 0)
					{
					okToRoll = false;
					document.theSpreadsheet.expr.value = "You cannot multliply the changing row by zero."
					}
				else if ( (i < 0) || (i > numRows) || (Math.round(i) != i))
					{
					okToRoll = false;
				document.theSpreadsheet.expr.value = "Row "+i+" is not a valid row number."
					}
				else if ( (j < 0) || (j > numRows) || (Math.round(j) != j) || (j == i))
					{
					okToRoll = false;
					document.theSpreadsheet.expr.value = "Row "+j+" is not a valid row number."
					}
				} // end of second batch of tests

			if (okToRoll)
				{
				rowOp(theMatrix,i, j, a, b);
				doNotReduce = true;
				displayMatrix();
				doNotReduce = false;

				} // of okToRoll
			okToRoll = true;	// reset
	} // if not skip This Row
		} // ijk
} // end of doRowOps

function parseRowOp(inString) {
	document.theSpreadsheet.expr.value = "";
	var theResult = new Array();
// alert(inString);
// some preprocessing if necessary here:
	inString = replaceSubstring(inString,"--","+");
	inString = replaceSubstring(inString,"-R","-1R");	
	inString = replaceSubstring(inString,"-r","-1r");	
	inString = stripChar(inString,"*");
	var L = inString.length;
	var outString = "";
	var rowNum1 = 0;	// will be in position 1 of theResult
	var rowNum2 = 0;	// will be in position 2 of theResult
	var coeff1 = 0;		// will be in position 3 of theResult
	var coeff2 = 0;		// will be in position 4 of theResult
	var pieces = 1;		// will be in position 0 of theResult
	var minusFlag = false;
	// need to break the string into two pieces at plus-minus
	var leftPiece = inString;
	var rightPiece = ""; 
	var permissionToBreak = false; // remains so until "r" encountered
	for (var i = 0; i <= L-1; i++) {
		
		var dig = inString.charAt(i);
		if (dig.toLowerCase() == "r") permissionToBreak = true;
		dig = inString.charAt(i);
		if (((dig == "+") || (dig == "-")) && (permissionToBreak)) { 
 			pieces = 2;
			leftPiece = inString.substring(0, i);
			rightPiece = inString.substring(i+1, L);
			if (dig == "-")  minusFlag = true;
			i = L; // exit loop
       	 } // end if
		} // i
	// Now deal with each piece
// alert("HERE; leftPiece is ***" + leftPiece + "***");
// alert("HERE; rightPiece is ***" + rightPiece + "***");


	for (var k = 1; k <= pieces; k++) { 
// alert("k = " + k);
		if (k == 1) inString = leftPiece;
		else inString = rightPiece;
		L = inString.length;
		for (var i = 0; i <= L-1; i++) 
			{
			if (((inString.charAt(i) == "R") || (inString.charAt(i) == "r")) && (k == 1)) 
				{
// alert(leftString(inString,i-1));
				if (i == 0) coeff1 = 1;
				else coeff1 = eval(leftString(inString,i));

//  debug;
// alert("coeff1 =  "+ coeff1);
// end debug
				rowNum1 = eval(rightString(inString, L-i-1));
				
				} // end if

			if (((inString.charAt(i) == "R") || (inString.charAt(i) == "r")) && (k == 2)) 
				{
				if (i == 0) coeff2 = 1;
				else coeff2 = eval(leftString(inString,i));
				rowNum2 = eval(rightString(inString,L-i-1));
				if (minusFlag) coeff2 = -coeff2;
				}
			} // next i
		} // next k


theResult[0] = pieces;
theResult[1] = rowNum1;
theResult[2] = rowNum2;
theResult[3] = coeff1;
theResult[4] = coeff2;
//  debug;
// alert( "***"+ theResult[3] + "***"+ theResult[1] + "***"+ minusFlag +  "***"+ theResult[4] + "***"+ theResult[2] + "***; "+ theResult[0] + " pieces" );
// end debug
return(theResult);


	} // parseRowOp

function paintCol(colnum, color){
	count = colnum - 1
	for( i = 0; i < numRows; i++){
		document.theSpreadsheet1[count].style = "background-color:" + color;
		count += maxCols;
	}
}

function verifyPivots(){
	for(i = 1; i <= maxRows; i++){
		ok = true;
		var pivotCol = theBasis[i];
			if(pivotCol == 0 ) continue; //no pivot in this row
			if(theMatrix[i][pivotCol] == 1)  {
				for(j = 1; j <= numRows; j++)//check for nonzeros above and below the pivot
					if (i != j &&   theMatrix[j][pivotCol] != 0 ) {ok = false; break;}
				}
			else ok = false;
		if(ok){
			document.lpstuff[2*(i-1)].value = theLabels[pivotCol];}
		else{//remove pivot 
			theBasis[i] = 0;
			paintCol(pivotCol, "FFFFFF");
			document.lpstuff[2*(i - 1)].value = "";}
	
		}//for
	}//verifyPivots


function doIt(){

	fractionMode = false;
	integerMode = false;
	var theMode = document.theSpreadsheet.Mode.selectedIndex;
	if (document.theSpreadsheet.Mode.options[theMode].text == "Fraction") fractionMode = true;
	else if (document.theSpreadsheet.Mode.options[theMode].text == "Integer") integerMode = true;

	var num = doIt.arguments[0];

	//**********

	// Option 1 Pivot
	if (num == 1)
		{
		readMatrix();
		verifyPivots();
		if (theMatrix[activeX][activeY] == 0) 
			{
			okToRoll = false;
			document.theSpreadsheet.expr.value = "You cannot pivot on a zero."
			}
		if (okToRoll)
			{

			pivot(theMatrix,numRows,numCols,activeX,activeY);
			var leaving = theBasis[activeX];
			if(leaving != activeY){
				if(leaving >0) paintCol(leaving, "FFFFFF");
				paintCol(activeY, "DDDDDD");
				document.theSpreadsheet1[maxCols*(activeX-1) + activeY -1].style="background-color:AAAAAA";
				theBasis[activeX] = activeY;
				document.lpstuff[2*activeX -2].value = theLabels[activeY];
				for(i = 1; i <= maxRows; i++)//cannot have two pivots in the same column
					if(theBasis[i] == activeY && i != activeX) theBasis[i] = 0;
				
			}
			displayMatrix();
			document.theSpreadsheet.expr.value = "Done."
			} // of okToRoll
		okToRoll = true;	// reset 
		// readMatrix(); 	// an extra one for TESTING -- not needed
		} // end of this option

	// Option 2 // preliminary checks
	else  if (num == 2)
		{
		okToRoll = true;
		stepName = "Rounding information"
		var accuracydig = document.theSpreadsheet.acc.value;
		
		if ( (accuracydig == "") || (!looksLikeANumber(accuracydig)) ) { document.theSpreadsheet.expr.value = "Enter a value for the accuracy (Rounding) in the range 1-13."; okToRoll = false}
		
		if (okToRoll)
			{ 
			var thenum = eval(accuracydig); 
			if ((thenum < 1) || (thenum > 14)) {document.theSpreadsheet.expr.value = "Accuracy (Rounding) must be in the range 1-13."; okToRoll = false}
			
			else numSigDigs =thenum;

			} // if okToRoll
		} // end of this option
	
	// Option 3 (Erase)
	else  if (num == 3)
		{
		var count = 0;
		document.theSpreadsheet.expr.value = "";
		for (var i = 1; i <= maxRows; i++)
			{
			for (var j = 1; j <= maxCols; j++)
				{
				document.theSpreadsheet1[count].value = "";
				document.theSpreadsheet1[count].style = "background-color:FFFFFF";
				count++;
				}
			}
		document.rowops.reset();
		} // end of this option
	
	// Option 4 Divide by this
	else  if (num == 4)
		{
		readMatrix();
		if (theMatrix[activeX][activeY] == 0) 
			{
			okToRoll = false;
			document.theSpreadsheet.expr.value = "You cannot divide by zero."
			}
		if (okToRoll)
			{
			divideRowbySelection(theMatrix,numRows,numCols,activeX,activeY);
			displayMatrix();
			} // of okToRoll
		okToRoll = true;	// reset 
		
		} // of this option

	//  Option 5 General Row Operation
	else  if (num == 5)
		{
		readMatrix();
		var ast = stripSpaces(document.theSpreadsheet.a.value);
		var ist = stripSpaces(document.theSpreadsheet.i.value);
		var bst = stripSpaces(document.theSpreadsheet.b.value);
		var jst = stripSpaces(document.theSpreadsheet.j.value);
		if (ast == "") ast = "1";
		if (bst == "") bst = "1";
		if (!looksLikeANumber(ast) ||  !looksLikeANumber(bst) || !looksLikeANumber(ist) || !looksLikeANumber(jst) ) 
			{
			okToRoll = false;
			document.theSpreadsheet.expr.value = "You must first enter numbers in all four fields."
			}
		var a = eval(ast);
		var b = eval(bst);
		var i = eval(ist);
		if (jst != "") var j = eval(jst);
		else var j= 0;		// for a single multiple
		if (okToRoll) 
			{
			if  (a == 0)
				{
				okToRoll = false;
				document.theSpreadsheet.expr.value = "You cannot multliply the changing row by zero."
				}
			else if ( (i < 0) || (i > numRows) || (Math.round(i) != i))
				{
				okToRoll = false;
				document.theSpreadsheet.expr.value = "Row "+i+" is not a valid row number."
				}
			else if ( (j < 0) || (j > numRows) || (Math.round(j) != j) || (j == i))
				{
				okToRoll = false;
				document.theSpreadsheet.expr.value = "Row "+j+" is not a valid row number."
				}
			} // end of second batch of tests

		if (okToRoll)
			{
			rowOp(theMatrix,i, j, a, b);
			doNotReduce = true;
			displayMatrix();
			doNotReduce = false;

			} // of okToRoll
		okToRoll = true;	// reset
		}

	// Option 6 Display Operations Stack (for debugging)
	else  if (num == 6)
		{
		document.theSpreadsheet.output.value = "";
		var str = "Pointer is at #" + stackPtr + cr;
		str += "Format: 0/1 , row#,  multiple,  +/-,  row# multiple" + cr;
		for (var i = 1; i <= stackPtr; i++)
			{
			str += operationsStack[i] + cr;
			}
		document.theSpreadsheet.output.value = str;
		} // of this option
			
	// Option 7 Row Swap
	else if (num == 7)
		{
		readMatrix();
		var pst = document.theSpreadsheet.p.value;
		var qst = document.theSpreadsheet.q.value;
		if (!looksLikeANumber(pst) ||  !looksLikeANumber(qst) ) 
			{
			okToRoll = false;
			document.theSpreadsheet.expr.value = "You must first enter row numbers in both fields."
			}
		var p = eval(pst);
		var q = eval(qst);
		if (okToRoll)
			{
			if ( (p < 0) || (p > numRows) || (Math.round(p) != p))
				{
				okToRoll = false;
				document.theSpreadsheet.expr.value = "Row "+p+" is not a valid row number."
				}
			else if ( (q < 0) || (q > numRows) || (Math.round(q) != q))
				{
				okToRoll = false;
				document.theSpreadsheet.expr.value = "Row "+j+" is not a valid row number."
				}
			} // end of this round of tests

		if (okToRoll)
			{
			swapRows(theMatrix,p,q);
			displayMatrix();
			} // of okToRoll
		okToRoll = true;	// reset

		} // end of option 7

		// Option 8 Row Reduce
	else if (num == 8)
		{
		readMatrix();
		rowReduce();
		displayMatrix();
		document.theSpreadsheet.expr.value = "The matrix is reduced."
		} // end of Option 8

		//Options 101 to 100+maxCols Compute Theta Ratios
	else if (1 <= num - 100  <= maxCols )
		{
		var pivcol = num - 100;
		//document.theSpreadsheet.expr.value = "column number " + pivcol.toString();
		readMatrix();
		verifyPivots();
		var minRatio = -1;
		var ratio;
		//alert("Ratios for column " +  pivcol + " theBasis: " + theBasis[0] + theBasis[1] + theBasis[3] );
		for( i = 1; i<= maxRows; i++){

			document.theSpreadsheet.expr.value = i;
			b = theMatrix[i][numCols];
			a = theMatrix[i][pivcol];
			//alert("iteration " + i);
			if( a > 0 && b >= 0){
				ratio = b/a;
				//alert("a, b, ratio = " + a + b + ratio);
				if(minRatio == -1) {minRatio = ratio;
				//alert("a, b, ratio, min = " + a + b + ratio + minRatio);
				}
				else { //alert("about to modify minRatio. ratio, minRatio = " + ratio + " " + minRatio);
					if(minRatio > ratio ) minRatio = ratio;
					//alert("...modified");
					}
				}
			else {ratio = "";}
			document.lpstuff[2*i - 1].value = ratio;
			}
		for( i = 1; i<= maxRows; i++){
			b = theMatrix[i][numCols];
			a = theMatrix[i][pivcol];
			if( a > 0 && b >=0){
				ratio = b/a;
				if(ratio == minRatio) document.lpstuff[2*i -1].style="background-color:FFFFFF";
				else document.lpstuff[2*i -1].style="background-color:DDDDDD";
			}
			else document.lpstuff[2*i -1].style="background-color:DDDDDD";
			
		}//for
		}// end of Options 101 to 100+maxCols*/

} // end of doIt

