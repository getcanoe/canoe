function bin2String(array) {
      var result = "";
        for(var i = 0; i < array.length; ++i){
            result+= (String.fromCharCode(array[i]));
        }
return result;
 // return String.fromCharCode.apply(null, array);
}

function toHexString(byteArray) {
  return Array.from(byteArray, function(byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('')
}

function byteArrayToInt(array) 
{/*
    var b1 = parseInt(array[0]);
    var b2 = parseInt(array[1]);
    var intVal = (b2 * 256) + b1;
    return intVal;*/

    var pos = 0;
    var result = 0;
    for (var $i = 0, $length = array.length; $i < $length; $i++) 
    {
        var by = array[$i];
        result |= by << pos;
        pos += 8;
    }
    return result;
};


// Guess its not very pretty cause an online converter did this but I hope it works
function turnNANOAmountIntoRAW(nanoAmount) 
{
            var tempStr = null;
            if (nanoAmount.indexOf(".") != -1) {
                var parts = nanoAmount.split(".");
                while ((parts[1].length < 30)) {
                    parts[1] += "0";
                }
                ;
                tempStr = parts[0] + parts[1];
                while (((function (c) { return c.charCodeAt == null ? c : c.charCodeAt(0); })(tempStr.charAt(0)) == '0'.charCodeAt(0)))
                    tempStr = tempStr.substring(1);
            }
            else {
                tempStr = nanoAmount;
                for (var i = 0; i < 30; i++) {
                    tempStr += "0";
                }
                ;
            }
            return tempStr;
};


var RFIDInvoiceData = (function () 
{
    function RFIDInvoiceData(invoiceData) 
    {
        console.log("----- " + invoiceData);
        this.paymentDecisionStatus = RFIDInvoiceData.PAYMENT_DECISION_UNDECIDED;
        this.storeName = null;
        this.localCurr = null;
        this.localCurrAmount = 0;
        this.exchangeRate = 0;
        this.posAddress = null;
        this.spendAmountNANO = null;
        this.previousBlock = null;
        this.appRepAddress = null;
        this.signatureForRFIDPos = null;
	
    	// BigInt
    	this.rawBalanceBefore = null;
    	this.rawBalanceAfter = null;
	
        try {
            
            var startPosRawBalance = ((invoiceData[0] & 255) << 8) | (invoiceData[1] & 255);
            var startPosSendAmount = ((invoiceData[2] & 255) << 8) | (invoiceData[3] & 255);
            var startPosShopName = ((invoiceData[4] & 255) << 8) | (invoiceData[5] & 255);
            var startPosLocalCurr = ((invoiceData[6] & 255) << 8) | (invoiceData[7] & 255);
            var startPosExchangeRate = ((invoiceData[8] & 255) << 8) | (invoiceData[9] & 255);
            /*var startPosRawBalance = byteArrayToInt(new Array(invoiceData[0], invoiceData[1]));
            var startPosSendAmount = byteArrayToInt(new Array(invoiceData[2], invoiceData[3]));
            var startPosShopName = byteArrayToInt(new Array(invoiceData[4], invoiceData[5]));
            var startPosLocalCurr = byteArrayToInt(new Array(invoiceData[6], invoiceData[7]));
            var startPosExchangeRate = byteArrayToInt(new Array(invoiceData[8], invoiceData[9]));*/

            console.log("++startPosRawBalance = " + startPosRawBalance);
            console.log("++startPosSendAmount = " + startPosSendAmount);
            console.log("++startPosShopName = " + startPosShopName);
            console.log("++startPosLocalCurr = " + startPosLocalCurr);
            console.log("++startPosExchangeRate = " + startPosExchangeRate);
	    
    	    var pubKeyBoxByteConverted = new Array();
    	    pubKeyBoxByteConverted = arraycopy(invoiceData,10,pubKeyBoxByteConverted,0,32)	    	   
    	    
    	    posAddress = accountFromHexKey(toHexString(pubKeyBoxByteConverted)); 
            console.log("++posAddress = " + posAddress);
        
    	    var previousBlockByteConverted = new Array();
    	    previousBlockByteConverted = arraycopy(invoiceData,42,previousBlockByteConverted,0,32)
    	    
            previousBlock = toHexString(previousBlockByteConverted); 
            console.log("++previousBlock = " + previousBlock);
	    
    	    var appRepAddressByteConverted = new Array();
            appRepAddressByteConverted = arraycopy(invoiceData, 74, appRepAddressByteConverted, 0, 32);
            appRepAddress = accountFromHexKey(toHexString(appRepAddressByteConverted)); 
	    
            var rawBalanceLength = parseInt(startPosSendAmount) - parseInt(startPosRawBalance);
            var sendAmountLength = parseInt(startPosShopName) - parseInt(startPosSendAmount);
            var shopNameLength = parseInt(startPosLocalCurr) - parseInt(startPosShopName);
            var localCurrLength = parseInt(startPosExchangeRate) - parseInt(startPosLocalCurr);
            var exchangeRateLength = parseInt(invoiceData.length) - parseInt(startPosExchangeRate);

            var storeNameBytes = new Array();
	        storeNameBytes = arraycopy(invoiceData, startPosShopName, storeNameBytes, 0, shopNameLength);
            storeName = bin2String(storeNameBytes);
            console.log("++storeName = " + storeName);	    

            var localCurrBytes = new Array();
            localCurrBytes = arraycopy(invoiceData, startPosLocalCurr, localCurrBytes, 0, localCurrLength);
            localCurr = bin2String(localCurrBytes);   
	    
            var initialRawBalanceBytes = new Array();
	        initialRawBalanceBytes = arraycopy(invoiceData, startPosRawBalance, initialRawBalanceBytes, 0, rawBalanceLength);
	    	    
            var rawBalanceTempString = toHexString(initialRawBalanceBytes);
            while (rawBalanceTempString.startsWith("0")) {
                rawBalanceTempString = rawBalanceTempString.substring(1);
            }
	    
            rawBalanceBefore = new BigNumber(rawBalanceTempString);
            console.log("++rawBalanceBefore = " + rawBalanceBefore);  
            var sendAmountBytes = new Array();
            sendAmountBytes = arraycopy(invoiceData, startPosSendAmount, sendAmountBytes, 0, sendAmountLength);	
	    	    
            spendAmountNANO = bin2String(sendAmountBytes);
            console.log("++spendAmountNANO = " + spendAmountNANO);  
	    
	        var exchangeRateBytes = new Array();
            exchangeRateBytes = arraycopy(invoiceData, startPosExchangeRate, exchangeRateBytes, 0, exchangeRateLength);

            exchangeRate = parseFloat(bin2String(exchangeRateBytes));
            console.log("++exchangeRate = " + exchangeRate);  

            BigNumber.config({ DECIMAL_PLACES: 30 });
            BigNumber.config({ DECIMAL_PLACES: 30 });
	    
            var bigSpendAmount = new BigNumber(spendAmountNANO);
            console.log("++bigSpendAmount = " + bigSpendAmount.toString());      
            
            var bigExchangeRate = new BigNumber(exchangeRate);
            console.log("++bigExchangeRate = " + bigExchangeRate.toString());    

            var totalLocalCurrBig = bigSpendAmount.mul(bigExchangeRate);  
            console.log("++totalLocalCurrBig = " + totalLocalCurrBig);         

            // here
            localCurrAmount = parseFloat(totalLocalCurrBig);
            console.log("++localCurrAmount = " + localCurrAmount);       

	       /* TO DO: Not sure how to call this function, JS scope is a mystery to me */ 
            var rawSpendAmount = new BigNumber(turnNANOAmountIntoRAW(spendAmountNANO));
            console.log("++rawSpendAmount = " + rawSpendAmount); 
            var oldAmount = rawBalanceBefore;
            rawBalanceAfter = oldAmount.minus(rawSpendAmount);
            console.log("++rawBalanceAfter = " + rawBalanceAfter);  

            window.rfid_invoice_storename_value = storeName;
            window.rfid_invoice_amount_nano = spendAmountNANO;
            window.rfid_invoice_local_curr = localCurr;
            window.rfid_invoice_local_curr_amount = localCurrAmount;
            window.rfid_invoice_exchange_rate = exchangeRate;
            window.rfid_invoice_rawBalanceAfter = rawBalanceAfter;
            window.rfid_invoice_app_rep_address = appRepAddress;
            window.rfid_invoice_previous_block = previousBlock;
            window.rfid_invoice_pos_address = posAddress;


            window.rfid_invoice_created=true;
	    }
        catch (ex) 
	    {
	       console.log(ex);
        };
    }

    RFIDInvoiceData.prototype.getPaymentDecisionStatus = function () {
        return this.paymentDecisionStatus;
    };
    RFIDInvoiceData.prototype.getStoreName = function () {
        return this.storeName;
    };
    RFIDInvoiceData.prototype.getLocalCurrency = function () {
        return this.localCurr;
    };
    RFIDInvoiceData.prototype.getLocalCurrencyAmount = function () {
        return this.localCurrAmount;
    };
    RFIDInvoiceData.prototype.getExchangeRate = function () {
        return this.exchangeRate;
    };
    RFIDInvoiceData.prototype.getPosAddress = function () {
        return this.posAddress;
    };
    RFIDInvoiceData.prototype.getSpendAmountNANO = function () {
        return this.spendAmountNANO;
    };
    RFIDInvoiceData.prototype.getPreviousBlock = function () {
        return this.previousBlock;
    };
    RFIDInvoiceData.prototype.getAppRepAddress = function () {
        return this.appRepAddress;
    };
    RFIDInvoiceData.prototype.getSignatureForRFIDPos = function () {
        return this.signatureForRFIDPos;
    };
    RFIDInvoiceData.prototype.setSignatureForRFIDPos = function (sign) {
        this.signatureForRFIDPos = sign;
    };
    RFIDInvoiceData.prototype.setPaymentDecisionStatus = function (status) {
        this.paymentDecisionStatus = status;
    };
    RFIDInvoiceData.prototype.getRawBalanceBefore = function () {
        return this.rawBalanceBefore;
    };
    RFIDInvoiceData.prototype.getRawBalanceAfter = function () {
        return this.rawBalanceAfter;
    };
    return RFIDInvoiceData;
}());
RFIDInvoiceData.PAYMENT_DECISION_PAY = 5;
RFIDInvoiceData.PAYMENT_DECISION_UNDECIDED = 18;
RFIDInvoiceData["__class"] = "RFIDInvoiceData";