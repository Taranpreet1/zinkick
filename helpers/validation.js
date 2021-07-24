var validation = {

	parsevalidation 	:      function(errors){

		let message;
		for(let key in errors){

			message  = errors[key].message;
			break;
		}
		return message;
	}
}

module.exports = validation;




