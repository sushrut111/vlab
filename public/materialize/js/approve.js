function approve(regno){
	alert(regno);

		$.ajax({
		url: '/authorise',
		type: 'post',
		data: {'regno':regno},
		beforeSend:function(){
			//deactivate approve button
		},
		success: function (data) {
			console.log(data);
			Materialize.toast(data, 3000, 'rounded');
			class1 = '.'+regno;
			$(class1).addClass('disabled');
			$(class1).html('APPROVED');
		
		},
		error: function (jqXHR, textStatus, errorThrown)
		{
			var message = "Ops some Error occured! Please try again.";
			show_error(message, true);
		}
	});
}