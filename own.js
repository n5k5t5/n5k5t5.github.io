window.onerror = myErrorTrap;
var debug = false;
var maxCols = 15;
var maxRows = 25;
var mathRoomKey = false;
var dataBlock= ""; // for copying data
var ourGreen = "#5bb568"
//supported numerical types
const decimals = "decimals";
const fractions = "fractions";
const bigfracs  = "bigfracs";
var modes = [];

modes[decimals] =   {   equal: (n,m) => (n == m),
                        zero:  ()    => 0,
                        one:   ()    => 1,
                        sub:   (a,b) => a-b, 
                        div:   (a,b) => a/b, 
                        mul:   (a,b) => a*b,
                        greater: (n, m) => (n > m),
                        
                        isZero: (a) => a==0, //redundant

                        piv:     pivotMatrix,
                        str2num: (s) => stringToNumber(s, decimals),
                        num2str: (n) => numberToString(n, decimals),
                        float:   (n) => n   
                    };

modes[fractions] =  {   equal: (n,m) => (n[0]== m[0] && n[1] == m[1]),
                        zero:  ()    => [0,1],
                        one:   ()    => [1,1],
                        sub: fracSub,
                        div: fracDiv,
                        mul: fracMul,
                        greater: (n, m) => (n[0]*m[1] > n[1]*m[0]),

                        isZero: (a) => a[0] == 0,

                        piv:     fracPivotMatrix,
                        str2num: (s) => stringToNumber(s, fractions),
                        num2str: (n) =>  numberToString(n, fractions),
                        float:   (n) => n[0]/n[1],              
                    };
                    
modes[bigfracs] =   {   equal: (n,m) => (n[0]== m[0] && n[1] == m[1]),
                        zero:  () => [0n,1n],
                        one:   () => [1n,1n],
                        sub: fracSub,
                        div: fracDiv,
                        mul: fracMul,
                        greater: (n,m) => (n[0]*m[1] > n[1]*m[0]),

                        isZero: (a) => a[0] == 0,
                        piv: fracPivotMatrix,
                        str2num: (s) => stringToNumber(s, bigfracs),
                        num2str: (n) => numberToString(n, bigfracs),                
                        float: (n) => Number((n[0]*10n**10n)/n[1])/10**10,
                        };              
                       
//used in the excel-like feature that when you start entering into a cell, the cell's contents clear
var clearCell = false;

//current state of the tableau
var the = { numRows: 0, numCols: 0, matrix: [], colMap:[], colMapInv:[], pivots: [], mode: bigfracs, condensed: false, view: fractions, labels : []};

var submatrixSelectionStage = 0;
var submat11 = 0;
var submat12 = 0;
var submat21 = 0;
var submat22 =0; 
var thereAreWritableEntries  = true;
var toDo = { count : 0, queue: undefined, heap: {}};//keeping tracks of callbacks
var pastingStage = 0;
var pasteRegion = { x: 0, y: 0, rowLengths:[]};

var activeX;
var activeY;
var modeBtn;
var outputElt;
var sheet;
var sheetForm;


function max(x,y){
    return x>y? x:y;
};

function debug_me(s){if(debug) alert(s);}

//Convention:  the reference point for all coordinates within the grid is the most upper-left cell that can store a coefficient.
//This point has coordinates (0,0).  The firs coordinate grows as one moves down the spreadsheet and the second grows as one moves to the right in the spreadsheet.

/****************** ERROR HANDLER *************/
function myErrorTrap(message,url,linenumber) {
    alert("I can't do that.  Line " + linenumber + ": " + message);
    return (true);
} // end of on error

//create a new blank state with a matrix of dimensions m, n filled with zeros of data type dataType
function state(m, n, dataType){
    this.numRows = m;
    this.numCols = n;
    var mat = [];
    for( var i = 0; i < m; i++){
        mat.push((new Array(n)).fill(modes[dataType].zero()));
    this.matrix = mat;
    this.colMap = [];
    this.colMapInv = [];
    this.labels = [];
    this.pivots = [new (Array(m).fill(undefined))];
    
    this.mode = dataType;
    //perhaps these should be excluded later
    this.condensed = false;
    this.view = decimals;
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
    clone.colMapInv= s.colMapInv.slice();
    clone.pivots = s.pivots.slice();
    clone.mode = s.mode;
    clone.labels = s.labels.slice();
    //the state of the display
    clone.condensed = s.condensed;
    clone.view = s.view;
    return clone;
} 

function drawSpreadsheet(){
    outputElt = document.controls.output;
    sheet = document.getElementById("spreadsheet");
    var t = sheet;
    var r= t.lastElementChild.lastElementChild;
    //draw the header row -------------------------------------------------------------------------
    var i = -1;
    for(var j = 0; j < maxCols; j++ ){
        var inp = document.createElement("input");
        inp.setAttribute("type", "text");
        inp.setAttribute("id", "cell -1 " + j);
        inp.setAttribute("size", "10");
        inp.setAttribute("style","background-color:white; border-color:gray" );
      //inp.setAttribute("oninput", "alert(\"entering somn?\");");
        inp.setAttribute("onchange", "doOnLabelChange(this, -1," + j + ")");
        inp.setAttribute("onblur", "doOnBlur(this," + i + ", " + j + ")");
        inp.setAttribute("onfocus","checkin(-1, " + j + ")");
        inp.setAttribute("onkeydown", "doOnKeyDown(event, this, -1, " + j + ")");
        inp.setAttribute("ondblclick", "doItBaby(" + (100 + j) + ");");//show ratios
        inp.setAttribute("value", "" + (j+1));
        var c = document.createElement("td");
        c.appendChild(inp);
        r.appendChild(c)
    }
  //Draw the rest-------------------------------------------------------------------------
    for(var i = 0; i < maxRows; i++ ){
        r = document.createElement("tr");
        //var rowHtml = "<td><input type=\"text\" style= \"background-color:white ; border-color:gray\"  id = "+ i.toString() + " " + j.toString() + " onkeydown=\"doOnKeyDown(this)\"></td>"
        j = -2;
//create first entry in a row-----------------------------------
        c = document.createElement("td");
        var inp = document.createElement("input");
        inp.setAttribute("type", "text");
        inp.setAttribute("id", "cell " + i + " " + j );
        inp.setAttribute("size", "10");
        inp.setAttribute("style", "background-color:white; border-color:grey");
        inp.setAttribute("onfocus","checkin(" +i + "," + j+")");
        inp.setAttribute("onkeydown" , "doOnKeyDown(event, this, " + i + ", " + j + ")");   
        inp.setAttribute("onchange", "doOnLabelChange(this," + i + ", " + j + ")");
        inp.setAttribute("onblur", "doOnBlur(this," + i + ", " + j + ")");

        c.appendChild(inp);
        r.appendChild(c);

//create second entry-----------------------------
        j = -1;
        c = document.createElement("td");
        inp = document.createElement("input");
        inp.setAttribute("type", "text");
        inp.setAttribute("id", i + " " + j) ;
        inp.setAttribute("size", "10");

        inp.setAttribute("style", "background-color:#DDDDDD;");
        inp.setAttribute("readonly" , true);
      //inp.setAttribute("onkeydown" , "doOnKeyDown(this)");

        c.appendChild(inp);
        r.appendChild(c);
//create the rest of entries
        for(j = 0; j < maxCols; j++){
            c = document.createElement("td");
            inp = document.createElement("input");
            inp.setAttribute("type", "text");
            inp.setAttribute("id", "cell " + i + " " + j );
            inp.setAttribute("size", "10");
            inp.setAttribute("style", "background-color:white;");
            inp.setAttribute("readonly" , true);
            inp.setAttribute("onfocus","checkin("+i + "," + j+")");
            inp.setAttribute("onkeydown" , "doOnKeyDown(event, this, " + i + ", " + j + ")");   
            inp.setAttribute("ondblclick","doOnDblClick(this," +i + "," + j+")");
            inp.setAttribute("onchange", "cry(this.value);");
            inp.setAttribute("onblur", "doOnBlur(this," + i + ", " + j + ")");

            c.appendChild(inp);
            r.appendChild(c);
        }
        t.appendChild(r);

    }
    sheetForm = document.getElementsByName("sheetForm")[0];
    modeBtn = document.getElementById("mode");
    the.mode = modeBtn.value;

    mathRoomKey = true;

    say("Ready.");

}

function cry(s){//debug mode
    if(debug){
        outputElt.value += (s + "\r\n-> ");
        outputElt.scrollTop = outputElt.scrollHeight;
    }
}

function say(s){
        outputElt.value += (s + "\r\n-> ");
        outputElt.scrollTop = outputElt.scrollHeight;
}

function getcell(i,j){ //coordinates (0, 0) refer to the upper-left coefficient
    return sheetForm[(1+i)*(maxCols+2) + 2+j];
}

function checkin(row, col){
    activeX = row;
    activeY = col;
    cry("cell " + row.toString() + " " + col.toString());
    clearCell = true;
}

//to do on keydown
function doOnKeyDown(event, e, x, y){  
    if((x == -1 || y <0 ) && pastingStage == 0) return;
    if(toDo.queue != undefined) return; //do nothing because busy
    if((event.key === "Enter" || e.value == "") && e.readOnly){
        toDo.heap[x*maxCols+ y] = e.value; //putting task on the todo heap while saving the prior value in the cell
        toDo.count +=1;
        e.readOnly = false;
        e.style.borderColor = "gray";
        if(e.value != ""){
            e.value = numberToString(the.matrix[x][the.colMap[y]], the.mode);
            outputElt.value = e.value;
            };
        e.style.backgroundColor = "#DDDDDD";
        setTimeout(function(){e.style.backgroundColor = "";}, 100);
        }
    else if( event.key === "Enter" && !e.readOnly){ 
        //mathRoomKey = false;
        doOnBlur(e,x,y);
        }
}

function doOnEnter(x,y, value){
    //say("Is this the new value?");
}

function doOnDblClick(cell, x, y){
    cry("double click at  " + x + " " + y);
    if (x>=0 && y>=0){
        doOnBlur(cell, x,y);
        doItBaby("pivot", x, y);
    }

}

//entering matrix values
function doOnBlur(cell, x,y ){
    if(x == -1 || y == -2) return;
    if(cell.readOnly) return; 
    cry("doOnBlur");
    cell.style.borderColor = ourGreen;
    cell.style.backgroundColor = ourGreen;
    setTimeout(function(){cell.style.borderColor = "gray"; cell.style.backgroundColor = "";}, 100);
    cry( "Entered in " + cell.id + ": " + cell.value);
    var num = cell.value.replace(/\s/g, "").replace(/,/g, "");
    
    if(num != ""){
        cry(num); 
        num = modes[the.mode].str2num(num);
        if(num == undefined){ //input failed to parse into a number
            alert("I don't understand this number"); 
            if(toDo.heap[x*maxCols+y] =="") //the value previously displayed
                getcell(x,y).value = "";
            else getcell(x,y).value = numberView(the.matrix[x][y], the.mode);
        }
        else{
            cry("calling fillOut(" + x + " , " + y + ", " + num + " )");
            fillOut(x, y, num);
            cry("fillOut returned.");
            getcell(x,y).value = numberView(num, the.mode);
        }
    }
    cell.readOnly = true;
    delete toDo.heap[x*maxCols+y];
    toDo.count -= 1;
    if(toDo.count == 0 && toDo.queue != undefined){
        cry("doOnBlur: calling " + toDo.queue[0]);
        toDo.queue[0].apply(null, toDo.queue[1] );
    }
    else {cry("doOnBlur: not calling anything, toDo.count = " + toDo.count);}
    
}

var doOnBlurBackup = doOnBlur;

function doOnBlurWhenPasting(cell, x, y){
    if(cell.readOnly) return; 
    cry("Blur during paste");
    cell.style.borderColor = ourGreen;
    cell.style.backgroundColor = ourGreen;
    setTimeout(function(){cell.style.borderColor = ""; cell.style.backgroundColor = "";}, 100);
    cry( "Entered in " + cell.id + ": ")
    cry(cell.value);
    cry("Paste region has upper-left corner at " + x + ", " + y +".");
    var copyStr = getcell(x,y).value;
    //alert("I read the data.");
    //if(copyStr.search(/[\r\t]/)==-1) {alert("Bad data");return false;}
    //else {
        // some fixing up for spaces around signs
    copyStr=copyStr.replace(/( )([\+\-\/\*])( )/g,"$2");
    var rowArr=copyStr.split(" ");
    doOnBlur = doOnBlurBackup;
    var rowLengths = [];
    var nr=rowArr.length;
    cry("number of rows to paste: " + nr);
    for (var i=0;i<nr;i++) {
        var colArr=rowArr[i].split("\t");
        var nc = colArr.length;
        rowLengths.push(nc);
        cry("number of row elements to paste: " + nc);
        var z = y;
        for (var j=0;j<nc;j++){
            if(z == -1) z = 0;//skip the ratio column
            //alert("So far so good, want to write " + colArr[j]);
            //document.theSpreadsheet.expr.value = colArr[j];
            c = getcell(x+i, z);
            c.value = colArr[j];
            if(x+i == -1 || z == -2){
               doOnLabelChange(c, x+i, z);
            }
            else{
                c.style.backgroundColor = "orange";
                if(i !=0 || j !=0){
                    c.readOnly = false;
                    toDo.heap[(x+i)*maxCols+ z] = c.value; //putting task on the todo heap while saving the prior value in the cell
                    toDo.count +=1;
                }
                doOnBlur(c, x+i, z);
            }
            z += 1;
        }
    }		
    pasteRegion.x = i;
    pasteRegion.y = j;
    pasteRegion.rowLengths = rowLengths;
    //var num = cell.value.replace(/\s/g, "").replace(/,/g, "");

}

//Processing entered Labels
function doOnLabelChange(cell,x,y){
    cry("doOnLabelChange:");
    if( !mathRoomKey) return;
    mathRoomKey = false;
    //cell is assumed to be a header row or header column
    var label = cell.value.trim();
    cry("x, y, trimmed value= " + x + ",  "  + y + ",  " + label);
    if(the.condensed){
        if(x ==-1 && y>=0 && y < the.numCols-the.numRows){
          the.labels[the.colMap[y]] = label;
        }
        else if(y == -2 && x >=0 && x<the.numRows){//row label
         the.labels[the.pivots[x]] = label;
        }
    }
    else if(x == -1 && y>=0 && y < the.numCols){//col label
        //y -= 2; //index in the matrix
        the.labels[the.colMap[y]] = label;
    }
    mathRoomKey = true;
}

function doOnChangeMode(btn){  
    if(the.numRows != 0 || the.numCols != 0){
        btn.value = the.mode;
        say("I cannot change mode when there is data in the matrix");
        return;
    }
    var newMode = btn.value;
    cry(newMode);
    the.mode = newMode;  
    if(newMode == decimals) {
        document.getElementById("view").style.visibility="hidden";
        the.view = decimals;
    }
    else document.getElementById("view").style.visibility="visible";
}

function changeView(v){
    the.view = v;
    displayMatrix();
    cry(v);
}

function doItBaby(){
    var c;//cell
    if(toDo.queue != undefined) return;
    if(toDo.count > 0) {say("NOT READY TO doItBaby!"); toDo.queue = [doItBaby, doItBaby.arguments]; return;}
    if(toDo.count == 0)
    try{
        toDo.queue = "running";
        var action = doItBaby.arguments[0];
        var x = doItBaby.arguments[1];
        var y = doItBaby.arguments[2];
        var arith = modes[the.mode];//the number system
        cry("doItBaby: " + (action));

        if(action=="pivot"){
            var okToRoll = true;
            //use indexing appropriate for matrix
            //x -=1;
            var displayed_y = y;
            if(x>= the.numRows || displayed_y >= the.numCols - (the.condensed? (the.numRows):0) ){
                okToRoll = false;
            }
            else {
                var entering = the.colMap[y];//actual matrix column index
                if(arith.isZero(the.matrix[x][entering])){
                    okToRoll= false;
                }
            }
            if(!okToRoll){ say("I cannot pivot on zero");}
            else{
                cry("pivoting at " + x + ", " + entering);
                if(!the.condensed) verifyPivots();//never hurts, will optimize later
                cry(" about to pivot");
                arith.piv(the.matrix,the.numRows, the.numCols, x, entering);
                cry("done pivoting");
                //now update and redraw pivot positions
                var leaving = the.pivots[x];
                
                if(leaving != entering){
                    if(!the.condensed){
                        //alert("leaving= " + leaving);
                        if(leaving != undefined) paintCol(the.colMapInv[leaving], "#FFFFFF", 0, maxRows-1);
                        paintPivot(x, the.colMapInv[entering]); 
                    }
                    the.pivots[x] = entering;
                    getcell(x, -2).value = the.labels[entering];
                    for(var i = 0; i < maxRows; i++)//cannot have two pivots in the same column--seems redundant
                        if(the.pivots[i] == entering && i != x) {
                            the.pivots[i] = undefined;
                            getcell(i,-2).value = "";}
                    if(the.condensed){
                        the.colMap[displayed_y] = leaving;
                        the.colMapInv[leaving] = displayed_y;
                        getcell(-1,displayed_y).value =  the.labels[leaving];	  
                    }
                }
                cry("displaying matrix");
                displayMatrix();
                cry("Done.");
            }
            toDo.queue = undefined;
            }
        else if (action == 9){//paste
            cry("pasting: stage = " + pastingStage);
            if(pastingStage == 0){
                document.getElementById("paste").style.backgroundColor = "orange";
                say("Click on the upper-left corner of the paste region, press ctrl-V and then press Paste again.");
                doOnBlur = doOnBlurWhenPasting;
                pastingStage = 1;
            }
            else if(pastingStage ==1){
                document.getElementById("paste").style.backgroundColor = "";
                pastingStage = 0;
            }

        }
        else if(action ==10){//select a submatrix
            //alert("You want to select a submatrix?");
            //document.theSpreadsheet.expr.value = "selected " + submatrixSelectionStage + " " + x + " " + y;  
            if(submatrixSelectionStage ==0){
                submat11 = x;
                submat12 = y;	
                getcell(submat11,submat12).style.backgroundColor= "orange";
                submatrixSelectionStage = 1;
                say("Select the opposite corner and press Submatrix again.");
            }
            else if(submatrixSelectionStage == 1){
                //determine upper-left and lower-right corners of the copy rectangle
                if(x >= submat11) submat21 = x;
                else { submat21 = submat11; submat11 = x;}
                if(y >= submat12) submat22 = y;
                else{ submat22 = submat12; submat12 = y;}	
                //document.theSpreadsheet.expr.value = "selected " + submatrixSelectionStage + " " + submat11 + " " + submat12 + " to " + x + " " + y;
                dataBlock = "";
                for(var i = submat11; i <= submat21; i++){
                    for(var j = submat12; j<= submat22; j++){
                        if(j == -1) continue;
                        //alert("i , j = " + i + " " + j + " " + dataBlock);
                        var val = getcell(i,j).value;
                        dataBlock += val + ( (j==submat22)?"":"\t");
                        //f(j< y) dataBlock += "\t";
                        //else dataBlock += "\n";
                        getcell(i,j).style.backgroundColor = "orange";
                    }
                    dataBlock += ((i==submat21)?"":"\n");
                }
                document.getElementById("datapaste").value=dataBlock;
                document.getElementById("datapaste").select();
                say( "Press Ctrl-C to copy and then Submatrix to clear the selection.");
                submatrixSelectionStage = 3;
            }
            else if(submatrixSelectionStage ==3){
                for(var i = submat11; i <= submat21; i++){
                    for(var j = submat12; j<= submat22; j++){
                        if(j == -1) continue;
                        getcell(i,j).style.backgroundColor = "";
                    }
                }
                submatrixSelectionStage = 0;
                return;
            }

        }
        //Options 101 to 100+maxCols Compute Theta Ratios
        else if (100 <= action   &&  action < 100 + maxCols )
            {
            var gr = arith.greater;
            var pivCol = the.colMap[action - 100];
            var constCol = the.colMap[the.numCols - (the.condensed?the.numRows:0) - 1];
            //alert("action = " + action + ". Showing ratios in column number " + pivCol );
            verifyPivots();
            //alert("YO " + the.numRows);
            //if(the.condensed) pivCol += the.numRows;
            var minRatio = -1;//-1
            var ratio;
            //alert("Ratios for column " +  pivcol + " theBasis: " + theBasis[0] + theBasis[1] + theBasis[3] );
            for( i = 0; i< the.numRows; i++){
                //document.theSpreadsheet.expr.value = i;
                b = the.matrix[i][constCol];
                a = the.matrix[i][pivCol];
                //alert("iteration " + i);
                if( gr(a,arith.zero()) && (gr(b,arith.zero()) || arith.isZero(b))){
                    ratio = arith.div(b,a);
                    //alert("a, b, ratio = " + a + b + ratio);
                    if(minRatio == -1) {minRatio = ratio;
                    //alert("a, b, ratio, min = " + a + b + ratio + minRatio);
                    }
                    else { //alert("about to modify minRatio. ratio, minRatio = " + ratio + " " + minRatio);
                        if(gr(minRatio,ratio )) minRatio = arith.mul(ratio, arith.one());
                        //alert("...modified");
                        }
                    }
                else {ratio = "";}
                getcell(i, -1).value = (ratio == ""? "":arith.float(ratio));
            }
            //alert("minRatio = " + minRatio);
            for( i = 0; i< the.numRows; i++){
                b = the.matrix[i][constCol];
                a = the.matrix[i][pivCol];
                
                if( gr(a,arith.zero()) && (gr(b,arith.zero()) || arith.isZero(b))){
                    //if(i >numRows){
                    //alert("row " + i + "a = " + a + "b= " + b);
                    //}
                    ratio = arith.div(b,a);
                    //alert("ratio=" + ratio);
                    getcell(i, -1).style.backgroundColor = (arith.equal(ratio, minRatio))? "#FFFFFF":"#DDDDDD";
                }
                else getcell(i, -1).style.backgroundColor="#DDDDDD";	
            }//for
            toDo.queue = undefined;
        }// end of Options 101 to 100+maxCols*/
    }
    finally{
        toDo.queue = undefined;
    }
}//endo of doItBaby

function stringToNumber(s, mode){
    try{
        s = s.replace(/\s/g, "").replace(/,/g, "");
        if(mode == decimals){ 
            s = eval(s);
            if(isNaN(s)) return undefined;
            return s;
        }
        if(mode == fractions){
            frac = s.split("/");
            if(frac.length >2){
                say("I don't understand this expression");
                return undefined;
            }
            else if(frac.length == 2) {
                var numer = eval(frac[0]);
                var denom = eval(frac[1]);
                if(! Number.isInteger(numer) || !Number.isInteger(denom) || denom == 0) return undefined;
                else{
                    if(denom <0){
                        denom = -denom;
                        numer = -numer;
                    }
                    return  fracRed([numer, denom]);
                }
            }
            else{//frac has one entry
                var str = frac[0];
                var int_dec = str.split(".");
                if(int_dec.length == 2){
                    if( int_dec[0].match(/^[\+\-]?[0-9]*$/) != null && int_dec[1].match(/^[0-9]*$/) != null){
                        return fracRed( [eval(int_dec[0]+ int_dec[1]), 10**(int_dec[1].length)]);
                    }
                }
                var numer = eval(str);
                if(isNaN(numer)){return undefined;}
                var i = 0;
                while(!Number.isInteger(numer)){
                    numer *= 10;
                    i +=1;
                }
                return fracRed([numer,10**i]); 
            }       
        }
        if(mode==bigfracs){
            frac = s.split("/");
            if(frac.length >2){
                say("I don't understand this expression");
                return undefined;
            }
            else if(frac.length == 2) {
                var numer = BigInt(frac[0]);
                var denom = BigInt(frac[1]);
                //if(!Number.isInteger(numer) || !Number.isInteger(denom) || denom == 0) return undefined;
                //else{
                    if(denom <0){
                        denom = -denom;
                        numer = -numer;
                    }
                    return  fracRed([numer, denom]);
                //}
            }
            else{//frac has one entry
                var str = frac[0];
                var int_dec = str.split(".");
                if(int_dec.length == 2){
                    if( int_dec[0].match(/^[\+\-]?[0-9]*$/) != null && int_dec[1].match(/^[0-9]*$/) != null){
                        return fracRed( [BigInt(int_dec[0]+ int_dec[1]), 10n**BigInt(int_dec[1].length)] );
                    }
                }
                var numer = BigInt(str);
                return fracRed([numer, 1n]); 
            }       
        }

    }
    catch {return undefined;}
}

function numberToString(n, mode){
    if(mode == decimals){
        return n.toString();
    }
    if(mode == fractions){
        if(n[1] == 1) return n[0].toString();
        return n[0].toString() + "/" + n[1].toString();
        }
    if(mode == bigfracs){
        if(n[1] == 1n) return n[0].toString();
        return n[0].toString() + "/" + n[1].toString();
        }
}

//create a string representation of a number, as seen in the tableau
function numberView(n,mode){
    if(mode == decimals){
        if(the.view == decimals)
            return "" + n.toString();
    }
    if(mode == fractions){
        if(the.view == fractions){
            if(n[1] == 1) return "" + n[0].toString();
            return "" + n[0].toString() + "/" + n[1].toString();
        }
        else {//this.view == decimals
            return modes[fractions].float(n).toString();
        }
    }
    if(mode == bigfracs){
        if(the.view == fractions){
            if(n[1] == 1) return "" + n[0].toString();
            return "" + n[0].toString() + "/" + n[1].toString();
        }
        else {//view == decimals
            return modes[mode].float(n).toString();
        }
    }
}

//extend the matrix with zeros and put z in row x and col y on the grid relative to the Corner.  Update output 
function fillOut(x, y, z){

    var zero = modes[the.mode].zero;
    var one = modes[the.mode].one;
    var mat = the.matrix;
    var m = the.numRows;
    var n = the.numCols;
    var c = the.condensed? 1:0;
    var new_m = max(m, x+1);
    var cnew_m = c*new_m; //number of hidden columns
    var new_n = max(n-c*m, y + 1) + c*new_m; 
    cry("FillOut: placing " + z + "in grid position " + x + ", " + y)
    cry("FillOut:extending matrix to"+ m+ "x" + n+ " to " + new_m+ "x" + new_n); 
    //insert zero rows at the bottom
    for(var i = m; i < new_m; i++){
        mat[i] = []
        //mat[i].push(Array(y).fill(0));
        for(var j = 0; j < n; j++){
            mat[i].push(zero());
            //getcell(1+ i, 2+ j).value= 0;
            } 
        }
    if(the.condensed){//let's insert some pivot columns
        for(j = n; j < n + new_m - m; j++){
            for(i = 0; i<new_m; i++){
                mat[i][j] = zero();
            }
            mat[j-n+m][j] = one();
            the.pivots[j-n+m] = j;
        }    
    }
    
    //add new non-pivot columns
    for( j = n+ c*(new_m - m); j < new_n; j++){
        //alert("j=" + j);
        for(i = 0; i < new_m; i++){
            mat[i][j] = zero();
            //getcell(1+ i,2+ j-cnew_m).value =0;
        }
        the.colMap[j-cnew_m] = j;
        the.colMapInv[j] = j-cnew_m;
    }
    mat[x][the.colMap[y]] = z;
    getcell(x, y).value = modes[the.mode].num2str(z);
    the.numRows = new_m;
    the.numCols =  new_n;
   
    //now read labels
    for(j = n-c*m; j<= y; j++){
        the.labels[the.colMap[j]] = getcell(-1, j).value.trim();
    }
    if(the.condensed){
        for(i = m; i <=x; i++){
            the.labels[the.pivots[i]] = getcell(i,-2).value.trim();
        }
    }
    
}

function paintCol(colnum, color, t, b){ //from t down to b
    cry("painting column " + colnum + " from " + t + " to " + b);
    for(var i = t; i <= b; i++){
        getcell(i,colnum).style.backgroundColor = color;
    }
}

function paintPivot(r, c){
    cry("painting pivot " + r + ", " + c);
    for(var i = 0; i < the.numRows; i++){
        getcell(i,c).style.backgroundColor = "#DDDDDD";
    }	
    getcell(r,c).style.backgroundColor =  "#AAAAAA";
}

//erase labels and entries, but keep memory and history 
function erase(){
    clearTheScreen();
    //reset internally stored value
    the.numRows = 0;
    the.numCols = 0;
    the.matrix = [];
    the.labels = [];
    the.colMap = []
    the.colMapInv = [];
    the.labels = [];
    the.pivots = [];
}

//clear the webpage
function clearTheScreen(){
    //clear the matrix
    for(let i = 0; i < maxRows; i++){
        for(let j = 0; j < maxCols; j++){
            getcell(i, j).value = "";
            getcell(i,j).style = "background-color:#FFFFFF";
        }
    }
    
    //clear row labels
    for(i = 0; i < maxRows; i++){
        getcell(i, -2).value = "";
    }

    //clear column labels
    for(j = 0; j < maxCols; j++){
        getcell(-1, j).value = "";
    }

    //clear ratios
    for(i = 0; i < maxRows; i++){
        getcell(i, -1).value = "";
        getcell(i, -1).style.backgroundColor = "#DDDDDD";
    }
}

//assume state
function assumeState(newState){
    //erase the matrix along with labels
    clearTheScreen();
    the = cloneState(newState);
    //set mode, tableau type, matrix, column labels, row labels
    refresh();
}

function refresh(){
    document.getElementById("mode").value = the.mode;
    let viewElt = document.getElementById("view");
    if(the.mode == decimals) viewElt.style.visibility="hidden";
    else { 
        viewElt.style.visibility="visible";
        document.getElementById("viewselector").value = the.view;
    }

    setCondensedElementValue(the.condensed);
    displayMatrix();
}

function setCondensedElementValue(condensed){
    var value;
 	if(condensed) {
         value = "  Expand   ";
         document.getElementById("condensed").style.backgroundColor="#5bb568";}
 	else {
         value =          "Condense!";
         document.getElementById("condensed").style.backgroundColor="transparent";}
 	document.getElementById("condensed").value = value;
}

// ****** DISPLAY CURRENT MATRIX ****
function displayMatrix() {
    verifyPivots();
    // if(thereAreWritableEntries){
    //     for(var i = 0; i <the.numRows; i++)
    //         for(var j = 0; j<the.numCols; j++){
    //             getcell(1+i, 2+j).readOnly = true;
    //         }
    //     thereAreWritableEntries = false;
    // }
	if(!isInBasicForm() && the.condensed){
		switchTableauType();
		return;
    }
    
    var m = the.numRows;
	var n = the.numCols;
    var numDisplayedCols = n;
    debug_me("Proceeding in displayMatrix "+ the.colMap);
  	if(the.condensed) {
        numDisplayedCols = n-m;
        debug_me("condensed");
        }
    //write column labels
    for(var i = 0; i < numDisplayedCols; i++){
        //debug_me(i + " " + the.labels +  " .... " + the.colMap);
        getcell(-1,i).value = the.labels[the.colMap[i]];
    }
    
	var x = "";  // a string
    debug_me("about to display a "+ m+ " x " + n + " matrix");
 
//Display the matrix      
	    for (var i = 0; i < m; i++)
	    	{
		    for (var j= 0; j <  numDisplayedCols; j++) 		
		    	{
		    	getcell(i,j).value = numberView(the.matrix[i][the.colMap[j]], the.mode);
		    	} // if ok
		    } // j 
		
	//    } // i
	

//doNotReduce = true;		// turns off automatic reduction

//clear ratios
for(var i = 0; i< the.numRows; i++){
	getcell(i, -1).value = "";
	getcell(i, -1).style = "background-color:#DDDDDD";
    }
cry("Finished displaying Matrix");
return(0);
}// ******** END OF DISPLAY ROUTINE ***************

function switchTableauType(){
    //alert("switchTableau");
	if(the.condensed){ 
        //remap columns
        //there are two ways to do it.  Choose one by putting false or true inside this if:
        if(false){ 
            for(var i  = 0; i < the.numCols; i++) {
                
                    the.colMap[i] = i;
                    the.colMapInv[i] = i;
                }
        }
        else{
            the.colMap = the.pivots.concat(the.colMap);
            for(var i = 0; i< the.numCols; i++){
                the.colMapInv[the.colMap[i]] = i;
            }
        }
        
        //write column labels
		for(i  = 0; i < the.numCols; i++) {
			getcell(-1, i).value = the.labels[the.colMap[i]];
        }
		//paint pivots
        for(var i = 0; i<the.numRows; i++) paintPivot(i, the.colMapInv[the.pivots[i]]);	
        debug_me("painted pivots");
	}	
    else {//not condensed
        verifyPivots();//should be done outside to prevent double-verification
		if(isInBasicForm()){ 
            //alert("not condensed:basic form");
			//find unpivoted columns
			var k = 0;
			for(var j = 0; j < the.numCols; j++){
				//erase column labels
				getcell(-1, j).value = "";
                var pivoted = false;
                
				for(var i = 0; i<the.numRows; i++){
                    //debug_me("washing " + [i,j]);
					getcell(i, j).style = "background-color:#FFFFFF";
					if(j>=the.numCols-the.numRows)
                        getcell(i, j).value = "";
					if(the.pivots[i] == j) {
						pivoted = true;
					}
                }
                //debug_me(j);
				if(!pivoted){
                    the.colMap[k] = j;
                    the.colMapInv[j] = k;
					k++;
				}
			}
		}
		else{
			say("Cannot condense because some rows contain no pivot. ");
			return;
		}
	}	 //not condensed 
    the.condensed = !the.condensed;
    debug_me("displaying");
    displayMatrix();
    debug_me("have displayed");
    setCondensedElementValue(the.condensed);
}//end of switchTableau

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
    return fracDiv(f, [g[1], g[0]]);
}

function fracisZero(a){return a[0] == 0;}

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

//Rather than using scaleRow and replaceRow, we code pivotMatrix ab initio.
function pivotMatrix(mat, rows, cols, row, col){
    var pivot = mat[row][col];
    for(var j = 0; j < cols; j++){
        mat[row][j] /=pivot;
    }
    for( var i = 0; i < rows; i++){
        var fact = mat[i][col];
        if(i == row || fact == 0) continue;
        for(j = 0; j <= cols; j++){
            mat[i][j] -= fact * mat[row][j];
        }
    }
}

function fracPivotMatrix(mat, rows, cols, row, col){ //pivot a matrix of fractions
    cry("fracPivotMatrix: pivoting at "  + row + ", " + col);
    var pivot = mat[row][col];
    for(var j = 0; j < cols; j++){
        mat[row][j] = fracDiv(mat[row][j], pivot);
    }

    for( var i = 0; i < rows; i++){
        var factor = mat[i][col];
        if(i == row || factor[0] == 0) continue;
        for(j = 0; j < cols; j++){
            mat[i][j] = fracSub(mat[i][j], fracMul(factor, mat[row][j]));
        }
    }
    cry("fracPivotMatrix: done.");
}
//-----------------------------------------------------------------
//Not used
function uniPivotMatrix(mat, rows, cols, row, col, arith){
    cry("fracPivotMatrix: pivoting at "  + row + ", " + col);
    var pivot = mat[row][col];
    if(arith.isZero(pivot)) { cry("uniPivotMatrix: cannot pivot at 0"); return -1;}
    for(var j = 0; j < cols; j++){
        mat[row][j] = arith.div(mat[row][j], pivot);
    }
    
    for( var i = 0; i < rows; i++){
        var factor = mat[i][col];
        if(i == row || arith.isZero(factor)) continue;
        for(j = 0; j < cols; j++){
            mat[i][j] = arith.sub(mat[i][j], arith.mul(factor, mat[row][j]));
        }
    }
    cry("uniPivotMatrix: done.");
}

function verifyPivots(){
    cry("verifying pivots");
    var arith = modes[the.mode];
	for(var i = 0; i < the.numRows; i++){
		var ok = true;
		var pivotCol = the.pivots[i];
        if(pivotCol == undefined ) {//no pivot in this row
            /*if(condenced)//something is wrong 
                alert("bad bad... missing pivot in condenced mode");
            else{
                //remove the label
                
            }*/
            //to do: implement search for a pivot
            cry("no pivot claimed in row " + i );
            getcell(i, -2).value = ""; //no pivot label should be here;
            continue;
        }
        cry("there is a claimed pivot at" + i + ", " + pivotCol);
		//alert("row, pivot = " + i + " " + pivotCol);
		if(arith.equal(the.matrix[i][pivotCol],arith.one()))  {
			for(var j = 0; j < the.numRows; j++)//check for nonzeros above and below the pivot
				if (i != j &&   !arith.isZero(the.matrix[j][pivotCol]) ) {ok = false; break;}
			}
            else ok = false;
		if(ok){
            cry("the column is pivoted as expected");
			if(!the.condensed) {
				paintPivot(i, the.colMapInv[pivotCol] );
				paintCol(the.colMapInv[pivotCol], "#FFFFFF", the.numRows, maxRows - 1);
			}
			getcell(i,-2).value = the.labels[pivotCol];
		}
        else {//remove pivot 
            cry("the column is NOT pivoted as expected");
			the.pivots[i] = undefined;
			if(!the.condensed){
			  paintCol(the.colMapInv[pivotCol], "#FFFFFF", 0, maxRows - 1);
			}
			getcell(i, -2).value = "";
	    	
        }
    }//for
    cry("Pivots verified");
}//verifyPivots

function isInBasicForm(){
	//must run verifyPivots() first
  for(var i = 0; i < the.numRows; i++)
	if( the.pivots[i] == undefined) return false;
  return true;	
 }
