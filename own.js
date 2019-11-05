window.onerror = myErrorTrap;
var maxCols = 15;
var maxRows = 25;
var activeX;
var activeY;
var theX;
var theY;
var mathRoomKey = false;
var dataBlock= ""; // for copying data
const decimals = 1;
const fractions = 2;
var modes = [];
modes[decimals] = 
                        { sub:  (a,b)=> a-b, 
                          div: (a,b)=> a/b, 
                          mul: (a,b)=> a*b,
                          isNil: (a) => a==0,
                          piv: pivotMatrix,
                          str2num :(s) => stringToNumber(s, decimals),
                          num2str: (n) => numberToString(n, decimals),
                          greater: (n, m) => (n > m),
                          float:(n) => n,
                          equal: (n,m)=> (n == m),
                          zero: 0,
                          one: 1
                          
                        };
modes[fractions] = 
                        { sub: fracSub,
                          div: fracDiv,
                          mul: fracMul,
                          isNil: (a) =>a[0] == 0,
                          piv: fracPivotMatrix,
                          str2num :(s) => stringToNumber(s, fractions),
                          num2str: (n) =>  numberToString(n, fractions),
                          greater: (n,m) => (n[0]*m[1] > n[1]*m[0]),
                          float: (n) => n[0]/n[1],
                          equal: (n,m) => (n[0]*m[1] == n[1]*m[0]),
                          zero: [0,1],
                          one: [1,1]
                        };
                    
var modeBtn;
var mode;
var view = fractions;
//var tableauType = "condensed";
var condensed = false;
//used in the excel-like feature that when you start entering into a cell, the cell's contents clear
var clearCell = false;
var enter2enter = false;
var the = { numRows: 0, numCols: 0, matrix: [], colMap:[], colMapInv:[], pivots: [], mode: fractions, condensed: false, view: decimals , labels : []};
//numRows
//numCols
//matrix : of dim numRows by numCols
//labels: array of length at least numCols
//colmap : any length
//pivots :array of length at least numRows
//mode : fraction, decimal, etc
//condensed : condensed or expanded
//view  : fractional or decimal, rounding precision.
var out;
var sheet;
var sheetForm;
var pivmat;
var submatrixSelectionStage = 0;
var submat11 = 0;
var submat12 = 0;
var submat21 = 0;
var submat22 =0; 
var doPivot= {decimals: pivotMatrix, fractions: fracPivotMatrix};
var thereAreWritableEntires  = true;
var toDo = { count : 0, queue: undefined, heap: {}};//keeping tracks of callbacks

function max(x,y){
    return x>y? x:y;
};


/****************** ERROR HANDLER *************/
function myErrorTrap(message,url,linenumber) {
    alert("I can't do that.  Line " + linenumber + ": " + message);
    return (true);
} // end of on error

 function state(m, n){
    this.numRows = m;
    this.numCols = n;
    var mat = [];
    for( var i = 0; i < m; i++){
        mat.push((new Array(n)).fill(0));
    this.matrix = mat;
    this.colMap = [];
    this.pivots = new (Array(m).fill(undefined));
    this.labels = [];
    }
}

function cloneState(s){
    var clone = {};
    var nr = s.numRows;
    var nc = s.numCols;
    var mat = [];
    for( var i = 0; i < nr; i++){ 
        mat.push([]);
        for(var j = 0; j < nc; j++){
            mat[i].push(s.matrix[i][j]);
        }   
    }   
    //the tableau
    clone.numRows = nr;
    clone.numCols = nc;
    clone.matrix = mat;
    clone.colMap = s.colMap.slice();
    clone.colMapInv= s.colManInv.slice();
    clone.pivots = s.pivots.slice();
    clone.mode = s.mode;
    clone.labels = s.labels.slice();
    //the state of the display
    //clone.tableauType = s.tableauType;
    clone.condensed = s.condensed;
    clone.view = s.view;
    return clone;
} 
//var the = { numRows: 0, numCols: 0, matrix: [], colmap:[], pivots: [], mode: fractions, condensed: true, view: decimals };
function drawSpreadsheet(){
    out = document.controls.output;
    sheet = document.getElementById("spreadsheet");
    var t = sheet;
    var r= t.lastElementChild.lastElementChild;
    //draw the header row -------------------------------------------------------------------------
    var i = 0;
    for(var j = 2; j < maxCols + 2; j++ ){
        var inp = document.createElement("input");
        inp.setAttribute("type", "text");
        inp.setAttribute("id", "cell 0 " + j);
        inp.setAttribute("size", "10");
        inp.setAttribute("style","background-color:white; border-color:gray" );
      //inp.setAttribute("oninput", "alert(\"entering somn?\");");
        inp.setAttribute("onchange", "doOnChange(this, 0," + j + ")");
        //inp.setAttribute("onblur", "doOnBlur(this," + i + ", " + j + ")");
        //inp.setAttribute("onfocus","checkin(0, " + j + ")");
        inp.setAttribute("onkeydown", "blink(this, 0, " + j + ")");
        inp.setAttribute("ondblclick", "doOnDblClick(this, 0, " + j + ")");
        var c = document.createElement("td");
        c.appendChild(inp);
        r.appendChild(c)
    }
  //Draw the rest-------------------------------------------------------------------------
    for(var i = 1; i <= maxRows; i++ ){
        r = document.createElement("tr");
        //var rowHtml = "<td><input type=\"text\" style= \"background-color:white ; border-color:gray\"  id = "+ i.toString() + " " + j.toString() + " onkeydown=\"blink(this)\"></td>"
        j = 0;
//create first entry in a row-----------------------------------
        c = document.createElement("td");
        var inp = document.createElement("input");
        inp.setAttribute("type", "text");
        inp.setAttribute("id", "cell " + i + " " + j );
        inp.setAttribute("size", "10");
        inp.setAttribute("style", "background-color:white; border-color:gray");
        //inp.setAttribute("onfocus","checkin("+i + "," + j+")");
        inp.setAttribute("onkeydown" , "blink(this, " + i + ", " + j + ")");   
        //inp.setAttribute("ondblclick","doOnDblClick(this, " +i + "," + j+")");
      //inp.setAttribute("oninput", "alert(\"entering somn?\");");
        inp.setAttribute("onchange", "doOnChange(this," + i + ", " + j + ")");
        //inp.setAttribute("onblur", "doOnBlur(this," + i + ", " + j + ")");

        c.appendChild(inp);
        r.appendChild(c);

//create second entry-----------------------------
        j = 1;
        c = document.createElement("td");
        inp = document.createElement("input");
        inp.setAttribute("type", "text");
        inp.setAttribute("id", i + " " + j) ;
        inp.setAttribute("size", "10");

        inp.setAttribute("style", "background-color:#DDDDDD;");
        inp.setAttribute("readonly" , true);
      //inp.setAttribute("onkeydown" , "blink(this)");

        c.appendChild(inp);
        r.appendChild(c);
//create the rest of entries
        for(j = 2; j < maxCols + 2; j++){
            c = document.createElement("td");
            inp = document.createElement("input");
            inp.setAttribute("type", "text");
            inp.setAttribute("id", "cell " + i + " " + j );
            inp.setAttribute("size", "10");

            inp.setAttribute("style", "background-color:white;");
            //inp.readOnly = true;
            inp.setAttribute("readonly" , true);
            inp.setAttribute("onfocus","checkin("+i + "," + j+")");
            inp.setAttribute("onkeydown" , "blink(this, " + i + ", " + j + ")");   
            inp.setAttribute("ondblclick","doOnDblClick(this," +i + "," + j+")");
          //inp.setAttribute("oninput", "alert(\"entering somn?\");");
            inp.setAttribute("onchange", "say(this.value);");
            inp.setAttribute("onblur", "doOnBlur(this," + i + ", " + j + ")");

            c.appendChild(inp);
            r.appendChild(c);
        }
        t.appendChild(r);

    }
    sheetForm = document.getElementsByName("sheetForm")[0];
    modeBtn = document.getElementById("mode");
    mode = modeBtn.value;

    mathRoomKey = true;

    say("ready");

}

function say(s){
    out.value += (s + "\r\n-> ");
    out.scrollTop = out.scrollHeight;
}
function getcell(i,j){
    return sheetForm[i*(maxCols+2) + j];
}



/*
function sayMore(s){
    document.controls.output.value += " " + s;
}*/

//var sheet = document.table.spreadsheet;

// function write_mat(i,j, val){
// sheetForm[i*(maxCols+2)+j].value = val;
// }



//
//
//
// Event handlers
//
//
//
function checkin(row, col){
    var x = row;
    var y = col;
    activeX = x;
    activeY = y;
    say("cell " + x.toString() + " " + y.toString());
    clearCell = true;
    enter2enter = true;
    //document.table[(maxCols+2)*(row)+ col].value = x.toString() + y.toString();
}
//to do on keydown


function blink(e, x, y){
    if(x == 0 || y <2) return;
    if(toDo.queue != undefined) return;
    if((event.key === "Enter" || e.value == "") && e.readOnly){
        //clearCell = false;
        //enter2enter = false;
        toDo.heap[(x-1)*maxCols+ y-2] += 1;
        toDo.count +=1;
        e.readOnly = false;
        if(e.value != ""){
            e.value = numberToString(the.matrix[x-1][y-2], mode);
        };
        enter2enter = false;
        var s = e.getAttribute("style");
        e.style.backgroundColor = "#DDDDDD";
        setTimeout(function(){e.style = s}, 100);
        }
    else if( event.key === "Enter" && !e.readOnly){
        //mathRoomKey = false;
        doOnBlur(e,x,y);
        /*say( "Entered in " + e.id + ": " + e.value);
        var s = e.getAttribute("style");
        e.style.borderColor = "blue";
        e.style.backgroundColor = "blue";
        setTimeout(function(){e.style = s}, 100);*/
        //var value = stripSpaces(e.value);
        //value = stripChar(value, ",");
        //value = eval(value);
        //doOnEnter(x,y, value);
        //mathRoomKey = true;
        }
    
    //if(e.readOnly && (event.key == "Enter" || the.matrix[x][y] == undefined) ){
}

function doOnEnter(x,y, value){
    say("Is this the new value?");
}
function doOnDblClick(cell, x, y){
    say("double click at  " + x + " " + y);
    if (x>0 && y>1){
        doOnBlur(cell, x,y);
        doItBaby("pivot", x, y);
    }

}
//entering row/column labels

function doOnBlur(cell, x,y ){
    if(cell.readOnly) return;
    say("blur");
    var s = cell.getAttribute("style");
    cell.style.borderColor = "blue";
    cell.style.backgroundColor = "blue";
    setTimeout(function(){if(cell.style.backgroundColor == "blue") cell.style = s; cell.style.borderColor = ""}, 100);
    say( "Entered in " + cell.id + ": " + cell.value);
    var num = cell.value.replace(/\s/g, "").replace(/,/g, "");
    if(num != ""){
        say(num);
        num = modes[mode].str2num(num);
        say("calling fillOut(" + (x-1) + " , " + (y-2) + " )");
        fillOut(the, x-1, y-2, num);
        getcell(x,y).value = numberView(num, mode);
    }
    //if(cell.value != "") 
    cell.readOnly = true;
    delete toDo.heap[(x-1)*maxCols+y-2] ;
    toDo.count -= 1;
    if(toDo.count == 0 && toDo.queue != undefined){
        apply(toDo.queue[0], toDo.queue[1]);
    }
    
}

function doOnLabelChange(cell, x, y){
    
}
function doOnChange(cell,x,y){
    say("doOnChange:");
    if( !mathRoomKey) return;
    mathRoomKey = false;
    //cell is assumed to be a header row or header column
    var label = cell.value.trim();
    say("x, y, trimmed value= " + x + ",  "  + y + ",  " + label);
    if(condensed){
        if(x ==0 && y>=2 && y < the.numCols-the.numRows+2){
          y -= 2; //index in the atrix
          the.labels[colMap[y]] = label;
        }
        else if(y == 0 && x >0 && x<the.numRows+1){//row label
         the.labels[the.pivots[x-1]] = label;
        }
    }
    else if(x == 0 && y>=2 && y < the.numCols+2){
        y -= 2; //index in the atrix
        the.labels[the.colMap[y]] = label;
    }
    mathRoomKey = true;
}

function doOnChangeMode(btn){
    
    if(the.numRows != 0 || the.numCols != 0){
        btn.value = mode;
        say("I cannot change mode now");
        return;
    }
    var newMode = btn.value;
    say(newMode);
    mode = newMode;    
    // switch(newMode) {
    //     case decimals:
    //         pivMat = pivotMatrix;
    //         break;
    //     case fractions:
    //         pivMat = fracPivotMatrix;
    //         break;
    //}
}

function changeView(v){
    view = v;
    displayMatrix();
    say(v);
}




function doIt(){
	var x;
	var y;
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
		if(!condensed) verifyPivots();
		if (theMatrix[theX][theY] == 0)
			{
			okToRoll = false;
			document.theSpreadsheet.expr.value = "You cannot pivot on a zero."
			}
		if (okToRoll)
			{
			pivot(theMatrix,numRows,numCols,theX,theY);

			var leaving = theBasis[theX];
			if(leaving != theY){
				if(!condensed){
         			if(leaving >0) paintCol(leaving, "FFFFFF", 1, maxRows);
          			/*paintCol(theY, "DDDDDD");
					  document.theSpreadsheet1[maxCols*(theX-1) + theY -1].style="background-color:AAAAAA";*/
					 paintPivot(theX, theY); 
          		}
				theBasis[theX] = theY;
				document.lpstuff[2*theX -2].value = theLabels[theY];
				for(var i = 1; i <= maxRows; i++)//cannot have two pivots in the same column
					if(theBasis[i] == theY && i != theX) {
						theBasis[i] = 0;
						document.lpstuff[2*(i - 1)].value = "";}
        		if(condensed){
          			colMap[theY- numRows] = theX;
					document.labels[theY - numRows] = theLabels[theX];	  
				}
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
		document.lpstuff.reset();
		//clear ratios colors
		for(var i= 1; i<maxRows; i++){
			document.lpstuff[2*i-1].style="background-color:DDDDDD";
		}
		} // end of this option
	
	// Option 4 Divide by this
	else  if (num == 4)
		{
		readMatrix();
		if (theMatrix[theX][theY] == 0)
			{
			okToRoll = false;
			document.theSpreadsheet.expr.value = "You cannot divide by zero."
			}
		if (okToRoll)
			{
			divideRowbySelection(theMatrix,numRows,numCols,theX,theY);
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

		
	else if (num == 9){//paste
		x = activeX;
		y = activeY;
		//alert("You want to paste from " + x + " , " + y +"?");
		var theStr = document.theSpreadsheet1[(x-1)*maxCols + y-1].value;
		//alert("I read the data.");
		//if(theStr.search(/[\r\t]/)==-1) {alert("Bad data");return false;}
		//else {
			// some fixing up for spaces arond signs
			theStr=theStr.replace(/( )([\+\-\/\*])( )/g,"$2");
			var rowArr=theStr.split(" ");
			var nr=rowArr.length;
			for (var i=0;i<nr;i++) {
				var colArr=rowArr[i].split("\t");
				for (var j=0;j<colArr.length;j++){
					//alert("So far so good, want to write " + colArr[j]);
					//document.theSpreadsheet.expr.value = colArr[j];
					document.theSpreadsheet1[maxCols*(x+i-1) + y+ j-1].value=colArr[j];
				}
			}		
		//}
	}
	else if(num ==10){//select a submatrix
		//alert("You want to select a submatrix?");
		x = activeX;
		y = activeY;
		//document.theSpreadsheet.expr.value = "selected " + submatrixSelectionStage + " " + x + " " + y;
		
		if(submatrixSelectionStage ==0){
			submat11 = x;
			submat12 = y;	
			document.theSpreadsheet1[(submat11-1)*maxCols + submat12-1].style= "background-color:orange";
			submatrixSelectionStage = 1;
			document.theSpreadsheet.expr.value = "Select the opposite corner and press Submatrix again.";
			return;
		}
		if(submatrixSelectionStage == 1){
			submat21 = x;
			submat22 = y;	
			//document.theSpreadsheet.expr.value = "selected " + submatrixSelectionStage + " " + submat11 + " " + submat12 + " to " + x + " " + y;
			dataBlock = "";
			for(var i = submat11; i <= x; i++){
				for(var j = submat12; j<= y; j++){
					//alert("i , j = " + i + " " + j + " " + dataBlock);
					var val = document.theSpreadsheet1[(i-1)*maxCols + j-1].value;
					dataBlock += val + ( (j==y)?"":"\t");
					//f(j< y) dataBlock += "\t";
					//else dataBlock += "\n";
					document.theSpreadsheet1[(i-1)*maxCols + j-1].style="background-color:orange";
				}
				dataBlock += ((i==x)?"":"\n");
			}
			document.getElementById("datapaste").value=dataBlock;
			document.getElementById("datapaste").select();
			document.theSpreadsheet.expr.value = "Press Ctrl-C to copy and then Submatrix to clear the selection.";

			submatrixSelectionStage = 3;
			return;
		}
		if(submatrixSelectionStage ==3){
			for(var i = submat11; i <= submat21; i++){
				for(var j = submat12; j<= submat22; j++){
					document.theSpreadsheet1[(i-1)*maxCols + j-1].style="background-color:white";
				}
			}
			submatrixSelectionStage = 0;
			return;
		}
		
	}
	//Options 101 to 100+maxCols Compute Theta Ratios
	else if (1 <= num - 100  <= maxCols )
		{
		var pivCol = num - 100;
		//document.theSpreadsheet.expr.value = "column number " + pivcol.toString();
		readMatrix();
		//alert("YO " + numRows);
		//document.theSpreadsheet.expr.value = "numRows = " + numRows;
		verifyPivots();
		if(condensed) pivCol += numRows;
		var minRatio = -1;
		var ratio;
		//alert("Ratios for column " +  pivcol + " theBasis: " + theBasis[0] + theBasis[1] + theBasis[3] );
		for( i = 1; i<= maxRows; i++){
			//document.theSpreadsheet.expr.value = i;
			b = theMatrix[i][numCols];
			a = theMatrix[i][pivCol];
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
			a = theMatrix[i][pivCol];
			
			if( a > 0 && b >=0){
				//if(i >numRows){
					//alert("row " + i + "a = " + a + "b= " + b);
				//}
				ratio = b/a;
				if(ratio == minRatio) document.lpstuff[2*i -1].style="background-color:FFFFFF";
				else document.lpstuff[2*i -1].style="background-color:DDDDDD";
			}
			else document.lpstuff[2*i -1].style="background-color:DDDDDD";	
		}//for
		}// end of Options 101 to 100+maxCols*/

} // end of doIt
function doItBaby(){
    if(toDo.queue != undefined)return;
    if(toDo.count == 0) toDo.queue = "running";
    if(toDo.count > 0) {toDo.queue = [doItBaby, doItBaby.arguments]; return;}
    var action = doItBaby.arguments[0];
    var x = doItBaby.arguments[1];
    var y = doItBaby.arguments[2];
    var arith = modes[mode];//the number system
    say("doItBaby: " + action + " at " + x + " " + y);
    if(action=="pivot"){
        var okToRoll = true;
        readMatrixBaby();
        //use indexing appropriate for matrix
        x -=1;
        var displayed_y = y;
        if(x>= the.numRows || displayed_y -2 >= the.numCols - condensed? the.numRows:0){
            okToRoll = false;
        }
        else {
            var entering = the.colMap[y-2];//actual matrix column index
            //alert("doItBaby: " + action + " at " + x + " " + y);
            if(arith.isNil(the.matrix[x][entering])){
                okToRoll= false;
            }
        }
        if(!okToRoll){ say("I cannot pivot on zero");}
        else{
            say("pivoting at " + x + ", " + entering);
            if(!condensed) verifyPivots();//never hurts, will optimize later
            say(" about to pivot");
            arith.piv(the.matrix,the.numRows, the.numCols, x, entering);
            say("done pivoting");
            //now update and redraw pivot positions
            var leaving = the.pivots[x];
            
            if(leaving != entering){
                if(!condensed){
                    if(leaving != undefined) paintCol(2+the.colMapInv[leaving], "#FFFFFF", 1, maxRows);
                    /*paintCol(theY, "DDDDDD");
                    document.theSpreadsheet1[maxCols*(theX-1) + theY -1].style="background-color:AAAAAA";*/
                    paintPivot(x, entering); 
                }
                the.pivots[x] = entering;
                getcell(1+x, 0).value = the.labels[entering];
                for(var i = 0; i < maxRows; i++)//cannot have two pivots in the same column--seems redundant
                    if(the.pivots[i] == entering && i != x) {
                        the.pivots[i] = undefined;
                        getcell(1+i,0).value = "";}
                if(condensed){
                    the.colMap[displayed_y-2] = leaving;
                    the.colMapInv[leaving] = displayed_y-2;
                    getcells(0,displayed_y).value = the.labels[leaving];	  
                }
            }
            say("displaying matrix");
            displayMatrix();
            say("Done.");
        }
        toDo.queue = undefined;
    }
    else if (action == 9){//paste
        //alert("You want to paste from " + x + " , " + y +"?");
        var theStr = getcell(x,y).value;
        //alert("I read the data.");
        //if(theStr.search(/[\r\t]/)==-1) {alert("Bad data");return false;}
        //else {
            // some fixing up for spaces arond signs
        theStr=theStr.replace(/( )([\+\-\/\*])( )/g,"$2");
        var rowArr=theStr.split(" ");
        var nr=rowArr.length;
        for (var i=0;i<nr;i++) {
            var colArr=rowArr[i].split("\t");
            for (var j=0;j<colArr.length;j++){
                //alert("So far so good, want to write " + colArr[j]);
                //document.theSpreadsheet.expr.value = colArr[j];
                getcell(x+i, y+j).value=colArr[j];
                //fillOut()
                }
            }		
        //}
    }
    else if(action ==10){//select a submatrix
        //alert("You want to select a submatrix?");
        //document.theSpreadsheet.expr.value = "selected " + submatrixSelectionStage + " " + x + " " + y;  
        if(submatrixSelectionStage ==0){
            submat11 = x;
            submat12 = y;	
            getcell(submat11,submat12).style= "background-color:orange";
            submatrixSelectionStage = 1;
            say("Select the opposite corner and press Submatrix again.");
            return;
        }
        if(submatrixSelectionStage == 1){
            //determine upper-left and lower-right corners of the copy rectangle
            if(x >= submat11) submat21 = x;
            else { submat21 = submat11; submat11 = x;}
            if(y >= submat12) submat22 = y;
            else{ submat22 = submat12; submat12 = y;}	
            //document.theSpreadsheet.expr.value = "selected " + submatrixSelectionStage + " " + submat11 + " " + submat12 + " to " + x + " " + y;
            dataBlock = "";
            for(var i = submat11; i <= submat21; i++){
                for(var j = submat12; j<= submat22; j++){
                    //alert("i , j = " + i + " " + j + " " + dataBlock);
                    var val = getcell(i,j).value;
                    dataBlock += val + ( (j==y)?"":"\t");
                    //f(j< y) dataBlock += "\t";
                    //else dataBlock += "\n";
                    getcell(i,j).style="background-color:orange";
                }
                dataBlock += ((i==x)?"":"\n");
            }
            document.getElementById("datapaste").value=dataBlock;
            document.getElementById("datapaste").select();
            say( "Press Ctrl-C to copy and then Submatrix to clear the selection.");
            submatrixSelectionStage = 3;
            return;
        }
        if(submatrixSelectionStage ==3){
            for(var i = submat11; i <= submat21; i++){
                for(var j = submat12; j<= submat22; j++){
                    getcell(i,j).style="background-color:white";
                }
            }
            submatrixSelectionStage = 0;
            return;
        }
        
    }
    //Options 101 to 100+maxCols Compute Theta Ratios
    else if (1 <= action - 100  <= maxCols )
        {
        var gr = arith.greater;
        var pivCol = the.colMap[action - 100];
        //document.theSpreadsheet.expr.value = "column number " + pivcol.toString();
        readMatrix();
        //alert("YO " + numRows);
        //document.theSpreadsheet.expr.value = "numRows = " + numRows;
        verifyPivots();
        //if(condensed) pivCol += the.numRows;
        var minRatio = -1;
        var ratio;
        //alert("Ratios for column " +  pivcol + " theBasis: " + theBasis[0] + theBasis[1] + theBasis[3] );
        for( i = 0; i< maxRows; i++){
            //document.theSpreadsheet.expr.value = i;
            b = the.matrix[i][the.numCols-1];
            a = the.matrix[i][pivCol];
            //alert("iteration " + i);
            if( gr(a,0) && gr(b,0)){
                ratio =arith.div(b,a);
                //alert("a, b, ratio = " + a + b + ratio);
                if(minRatio == -1) {minRatio = ratio;
                //alert("a, b, ratio, min = " + a + b + ratio + minRatio);
                }
                else { //alert("about to modify minRatio. ratio, minRatio = " + ratio + " " + minRatio);
                    if(gr(minRatio,ratio )) minRatio = ratio;
                    //alert("...modified");
                    }
                }
            else {ratio = "";}
            getcell(i, 1).value = arith.float(ratio);
        }
        for( i = 0; i< maxRows; i++){
            b = the.matrix[i][numCols];
            a = the.matrix[i][pivCol];
            
            if( a > 0 && b >=0){
                //if(i >numRows){
                    //alert("row " + i + "a = " + a + "b= " + b);
                //}
                ratio = arith.div(b,a);
                getcell(1+i, 1).style= "background-color:" + (arith.equal(ratio, minRatio))? "FFFFFF":"DDDDDD";
            }
            else getcell(1+i, 1).style="background-color:DDDDDD";	
        }//for
        }// end of Options 101 to 100+maxCols*/

}


function stringToNumber(s, mode){
    s = s.replace(/\s/g, "").replace(/,/g, "");
    if(mode == decimals){ return eval(s);}
    
    if(mode == fractions){
        frac = s.split("/");
        if(frac.length >2){
            say("I don't understand this expression");
            return undefined;
        }
        else if(frac.length == 2) {
            return [eval(frac[0]), eval(frac[1])];
        }
        else{
            return [eval(frac[0]), 1];
        }
    }
}

function numberToString(n, mode){
    if(mode == decimals){
        return s.toString();
    }
    if(mode == fractions){
        if(n[1] == 1) return n[0].toString();
        return n[0].toString() + "/" + n[1].toString();
        }
}

function numberView(n,mode){
    if(mode == decimals){
        if(view == decimals)
            return "*" + s.toString();
    }
    if(mode == fractions){
        if(view == fractions){
            if(n[1] == 1) return "*" + n[0].toString();
            return "*" + n[0].toString() + "/" + n[1].toString();
        }
        else {//view == decimals
            return "*"+ (n[0]/n[1]).toString();
        }
    }
}
//extend the matrix with zeros and put z in row x and col y. 
function fillOut(s, x, y, z){

    var zero = modes[mode].zero;
    var mat = s.matrix;
    var m = s.numRows;
    var n = s.numCols;
    var c = condensed? 1:0;
    var new_m = max(m, x+1);
    var cnew_m = c*new_m; //number of hidden columns
    var new_n = max(n-c*m, y + 1) + c*new_m; 
    say(" here in fillOut:"+ m+ " " + n+ " " + new_m+ " " + new_n); 
    //insert zero rows at the bottom
    for(var i = m; i < new_m; i++){
        mat[i] = []
        //mat[i].push(Array(y).fill(0));
        for(var j = 0; j < n; j++){
            mat[i].push(zero);
            //getcell(1+ i, 2+ j).value= 0;
            } 
        }
    if(condensed){//let's insert some pivot columns
        for(j = n; j < n + new_m - m; j++){
            for(i = 0; i<new_m; i++){
                mat[i][j] = 0;
            }
            mat[j-n+m][j] = 1;
        }    
    }
    
    //add new non-pivot columns
    for( j = n+ c*(new_m - m); j < new_n; j++){
        //alert("j=" + j);
        for(i = 0; i < new_m; i++){
            mat[i][j] = zero;
            //getcell(1+ i,2+ j-cnew_m).value =0;
        }
        s.colMap[j-cnew_m] = j;
        s.colMapInv[j] = j-cnew_m;
    }
    mat[x][y + cnew_m] = z;
    getcell(1+x, 2+y).value = modes[mode].num2str(z);
    s.numRows = new_m;
    s.numCols =  new_n;
   
    //now read labels
    for(j = n-c*m; j<= y; j++){
        the.labels[the.colMap[j]] = getcell(0, 2+j).value.trim();
    }
    if(condensed){
        for(i = m; i <=x; i++){
            the.labels[the.pivots[i]] = getcell(1+i,0).value.trim();
        }
    }
    
}
function readMatrixBaby(){


}
function readMatrix() {
    // reads the current Matrix
    theX = activeX;
    
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
            theMatrix[i][j] = 0;
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
    //alert("read matrix, numRows = " + numRows);
    //alert("Read matrix, " + theMatrix[numRows+1][1] + " " + theMatrix[numRows+1][2] + " " + theMatrix[numRows+1][3] + " " + theMatrix[numRows+1][4] + " " +  theMatrix[numRows+1][5] );
    //displayed positions of theMatrix columns
      for( var i = 1; i <= numCols; i++)
        if(condensed) colMap[i] = numRows + i; //put basic variables first
        else colMap[i] = i; //no remapping of columns
                                                   
    theY = colMap[activeY];
    count = 0;
    for (i = 1; i <= maxRows; i++)
        {
        for (j = 1; j <= maxCols; j++)
            {
            if((theRowSize>=i) && (theColSize >= j)){
                theString = stripSpaces(document.theSpreadsheet1[count].value);
                theString=stripChar(theString,",");
                if (theString == ""){
                    theMatrix[i][colMap[j]] = 0;
                    document.theSpreadsheet1[count].value = "0";
                }
                else{
                    theMatrix[i][colMap[ j] ] = eval(theString);
                }
            }
            // starts numbering at 0
            count++; 
            } // j
        } // i
      
    //augment with an identity matrix on the left if in condensed mode
    if(condensed)
      for(var j = 1; j <= numRows; j++)
          for(var i = 1; i <=numRows; i++)
            if( i == j) theMatrix[i][j] = 1;
            else theMatrix[i][j] = 0;
     
    // read variable labels from the column headers
     for (var j = 1; j<= theColSize; j++)
        { 
            theString = stripSpaces(document.labels[j-1].value);
            theString = stripChar(theString,",");
            //if( theString == "")
            //	{ theString = "x" + j.toString();}
            theLabels[colMap[j]] = theString;
        }
    // read variable labels from the rows if condensed
     if(condensed)
     {// read variable labels from the rows if condensed
        for (var i = 1; i<= theRowSize; i++)
         {
           theString = stripSpaces(document.lpstuff[2*(i-1)].value);
           theString = stripChar(theString,",");
           //if( theString == "")
            // { theString = "y"  + i.toString();}
           theRowLabels[i] = theString;
           theLabels[i] = theString;
         }
        //set the pivot locations in theBasis
           for(var i = 0; i <= numRows; i++){
            theBasis[i] = i;}
        numCols = numRows + numCols; 	 
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
        //save pivots
        for(i = 1; i <= maxRows; i++){
            theSavedBasis[i] = theBasis[i];
        }
        //save labels
        for(i = 1; i <=maxCols; i++){
            theSavedLabels[i] = theLabels[i];
        }
        //save type of tableau
        savedCondensed = condensed;
        } 
        //save colMap
        for(i = 1; i <= numCols; i++) savedColMap[i] = colMap[i];
        //save row /col nums
        savedNumRows = numRows;
        savedNumCols = numCols;
    
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


function paintCol(colnum, color, t, b){ //from t down to b
    for(var i = t; i <= b; i++){
        getcell(i,colnum).style.backgroundColor = color;
    }
}

function paintPivot(r, c){
    for(var i = 0; i < the.numRows; i++){
        getcell(1+i,2+c).style.backgroundColor = "#DDDDDD";
    }	
    getcell(1+ r,2+c).style.backgroundColor =  "#AAAAAA";
}
    
// ****** DISPLAY CURRENT MATRIX ****
function displayMatrix() {
    verifyPivots();
    // if(thereAreWritableEntires){
    //     for(var i = 0; i <the.numRows; i++)
    //         for(var j = 0; j<the.numCols; j++){
    //             getcell(1+i, 2+j).readOnly = true;
    //         }
    //     thereAreWritableEntires = false;
    // }
	if(!isInBasicForm() && condensed){
		switchTableauType();
		return;
    }
    say("Proceeding in displayMatrix");
	var numDisplayedCols = the.numCols;
  	if(condensed) {
		numDisplayedCols = the.numCols-the.numRows;
		//write column labels
		for(var i = 0; i < numDisplayedCols; i++){
			getcell[0][2+ i].value = the.labels[the.colMap[i]];
		}
	}
	var m = the.numRows;
	var n = the.numCols;
	var x = "";  // a string
    say("about to display a "+ m+ " x " + n + " matrix");
   /* 
	if (integerMode) {
		theMatrix = makeInteger(theMatrix, numRows, numCols, true)
		var count = 0;
		for (var i = 1; i <= maxRows; i++){
			for (var j = 1; j <= maxCols; j++){
				if ( (i <= numRows) &&  (j <= numDisplayedCols)) {
					document.theSpreadsheet1[count].value = theMatrix[i][colMap[j]];
				}
				count++; 
			} // j
		} // i
	}  // if integer mode
 // else, handle fractions & decimals
    else {*/
//Display the matrix      
	    for (var i = 0; i < the.numRows; i++)
	    	{
		    for (var j= 0; j <  numDisplayedCols; j++) 		
		    	{
		    	getcell(1+i,2+j).value = numberView(the.matrix[i][the.colMap[j]], mode);
		    	} // if ok
		    } // j 
		
	//    } // i
	

//doNotReduce = true;		// turns off automatic reduction

//clear ratios
for(var i = 1; i< 1+ the.numRows; i++){
	getcell(i, 1).value = "";
	getcell(i, 1).style = "background-color:#DDDDDD";
	}
return(0);
}

// ******** END OF DISPLAY ROUTINE ***************



function verifyPivots(){
    say("verifying pivots");
    var arith = modes[mode];
	for(var i = 0; i < the.numRows; i++){
		var ok = true;
		var pivotCol = the.pivots[i];
        if(pivotCol == undefined ) {//no pivot in this row
            /*if(condenced)//something is wrong 
                alert("bad bad... missing pivot in condenced mode");
            else{
                //remove the label
                
            }*/
            getcell(1+i, 0).value = ""; //no pivot label should be here;
            continue;
        }
        say("there is a claimed pivot at" + i + ", " + pivotCol);
		//alert("row, pivot = " + i + " " + pivotCol);
		if(arith.equal(the.matrix[i][pivotCol],arith.one))  {
			for(var j = 0; j < the.numRows; j++)//check for nonzeros above and below the pivot
				if (i != j &&   !arith.isNil(the.matrix[j][pivotCol]) ) {ok = false; break;}
			}
            else ok = false;
		if(ok){say("the column is pivoted as expected");
			if(!condensed) {
				paintPivot(i, pivotCol );
				paintCol(2+pivotCol, "#FFFFFF", 1+ the.numRows, 1+ maxRows - 1);
			}
			getcell(1+i,0).value = the.labels[pivotCol];
		}
		else {//remove pivot 
			the.pivots[i] = undefined;
			if(!condensed){
			  paintCol(2+pivotCol, "#FFFFFF", 1, 1+ maxRows - 1);
			}
			getcell(1+i, 0).value = "";
	    	
        }
    }//for
    say("Pivots verified");
}//verifyPivots

function isInBasicForm(){
	//must run verifyPivots() first
  for(var i = 0; i < the.numRows; i ++)
	if( the.pivots[i] == undefined) return false;
  return true;	
 }

 /*
 function showRatios(){
	doIt(100 + activeY);
}

function onSwitchTableauType(){
	readMatrix();
	switchTableauType();
}
*/
function switchTableauType(){
	if(condensed){ 
		for(var i  = 0; i < the.numCols; i++) {
			//remap columns
			the.colMap[i] = i;
			//write column labels
			getcell(0, 2+i).value = the.labels[the.colMap[i]];
		}
		//paint pivots
		for(var i = 0; i<the.numRows; i++) paintPivot(i, the.pivots[i]);	
	}	
	else {//not condensed
		verifyPivots();//should be done outside to prevent double-verification
		if(isInBasicForm()){ 
			//find unpivoted columns
			var k = 0;
			for(var j = 0; j < the.numCols; j++){
				//erase column labels
				getcell(0, 2+j).value = "";
				var pivoted = false;
				for(var i = 0; i<the.numRows; i++){
					getcell(1+i, 2+j).style="background-color:FFFFFF";
					if(j>the.numCols-the.numRows)
                        getcell(1+i, 2+j).value = "";
					if(the.pivots[i] == j) {
						pivoted = true;
					}
				}
				if(!pivoted){
					colMap[k] = j;
					k++;
				}
			}
		}
		else{
			say("Cannot condense because some rows contain no pivot. ");
			return;
		}
	}	 //not condensed 
  	condensed = !condensed;
	displayMatrix()
 	if(condensed) var value = "  Condensed  ";
 	else value = "Expanded";
 	getcell(0,0).value = value;
}

function showRatios(){
	doIt(100 + activeY);
}




//----math-----------------------------------------------------------------------------
function gcd(a,b){
    while( a != 0){
        var r = b % a;
        b = a;
        a = r; 
    } 
    return (b>=0)? b: -b;
}
function fracRed(f){//in place
    var g = gcd(f[0], f[1]);
    f[0]/= g;
    f[1]/= g;
    return f;
}
function fracSub(a, b){

    return fracRed([a[0]*b[1] - a[1]*b[0], a[1]*b[1]]);
}

function fracDiv(f, g){
    var u = gcd(f[0], g[0]);
    var v = gcd(g[1], f[1]);
    var res =  [ (f[0]/u) * (g[1]/v), (g[0]/u) * (f[1]/v) ];
    if(res[1]< 0) res =  [-res[0], -res[1]];
    return res;
}

function fracMul(f, g){
    return fracDiv(f, [g[1],g[0]] );
}

function fracIsNil(a){return a[0] == 0;}


//Row operations--------------------------------

//replacement, done in place
function replaceRow(mat, cols,  row1, row2, fact){
    for(var j = 0; j < cols; j++){
        mat[row1][j] += fact*mat[row2][j];
    }
}

function scaleRow(mat, cols, row, fact){
    for(var j = 0; j < cols; j++){
        mat[row][j] *= fact;
    }
}
/*function FracScaleRowFrac(mat, cols, row, fact){
    for(var j = 0; j < cols; j++){
        mat[row][j] = fracmul(mat[row][j],fact);
    }
}*/
//Rather than using scaleRow and replaceRow, we code pivotMatrix ab initio.
function pivotMatrix(mat, rows, cols, row, col){
    //scale pivot row
    // if(mode == fractions){
    //     var mult = function(x,y){Mat}
    //}
    var pivot = mat[row][col];
    for(var j = 0; j < cols; j++){
        mat[row][j] /=pivot;
    }
    //mat[row][col] = 1 //just in case floating point arithmetic gives an error?..
    for( var i = 0; i < rows; i++){
        var fact = mat[i][col];
        if(i == row || fact == 0) continue
        for(j = 0; j <= cols; j++){
            mat[i][j] -= fact * mat[row][j];
        }
        //mat[i][col] = 0 //in case floating point arithmetic fails?...
    }
}

function fracPivotMatrix(mat, rows, cols, row, col){
    //scale pivot row
    // if(mode == fractions){
    //     var mult = function(x,y){Mat}
    //}
    say("fracPivotMatrix: pivoting at "  + row + ", " + col);
    var pivot = mat[row][col];
    for(var j = 0; j < cols; j++){
        //alert("here we go... j = " + j);
        mat[row][j] = fracDiv(mat[row][j], pivot);
    }
    //alert("done scaling the pivot row");
    //mat[row][col] = 1 //just in case floating point arithmetic gives an error?..
    for( var i = 0; i < rows; i++){
        //alert("here we go... i = " + i);
        var fact = mat[i][col];
        if(i == row || fact[0] ==0) continue;
        for(j = 0; j < cols; j++){
            mat[i][j] = fracSub(mat[i][j], fracMul(fact, mat[row][j]) );
        }
        //mat[i][col] = 0 //in case floating point arithmetic fails?...
    }
    say("fracPivotMatrix: done.");
}
//------------------------------------------------------------------

