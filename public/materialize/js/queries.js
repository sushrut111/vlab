function fetchthread(threadid){
	// alert(threadid);

		$.ajax({
		url: '/querythread/'+threadid,
		type: 'get',
		beforeSend:function(){
			
		},
		success: function (data) {
			console.log(data);
			var responses = JSON.parse(data);

			var str = '	<ul class="collection">';
			for(var i=0;i<responses.length;i++){
				str+= '<li class="collection-item"><div class="chip">'+responses[i].author+'</div><span class="title">'+responses[i].response+'<span style="font-size:8px;" class="right bottom">'+responses[i].timestamp+'</span></li>';
			}
			
			str+='</ul>';
			str+='<br><input type="text" class="testclass" placeholder="enter response here" id="response'+responses[0].threadid+'"><button class="btn btn-small submitbutt" onclick="submitres('+"'"+responses[0].threadid+"'"+')">Send</button>';
			var divid = "#modal" + responses[0].threadid;
			console.log(divid);
			$(divid).html(str);
		
		},
		error: function (jqXHR, textStatus, errorThrown)
		{
			var message = "Ops some Error occured! Please try again.";
			show_error(message, true);
		}
	});
}

function submitres(threadid){
	var inid = '#response' + threadid;
	var msg = $(inid).val();
	$.ajax({
		url: '/querythread',
		type: 'post',
		data: {'threadid':threadid,'response':msg},
		beforeSend:function(){
			$('.submitbutt').addClass('disabled');
			$('.testclass').addClass('disabled');
		},
		success: function (data) {
			console.log(data);
			var responses = JSON.parse(data);

			var str = '	<ul class="collection">';
			for(var i=0;i<responses.length;i++){
				str+= '<li class="collection-item"><div class="chip">'+responses[i].author+'</div><span class="title">'+responses[i].response+'<span style="font-size:8px;" class="right bottom">'+responses[i].timestamp+'</span></li>';
			}
			
			str+='</ul>';
			str+='<br><input type="text" class="testclass" placeholder="enter response here" id="response'+responses[0].threadid+'"><button class="btn btn-small" onclick="submitres('+"'"+responses[0].threadid+"'"+')">Send</button>';
			var divid = "#modal" + responses[0].threadid;
			console.log(divid);
			$(divid).html(str);
		
		},
		error: function (jqXHR, textStatus, errorThrown)
		{
			var message = "Ops some Error occured! Please try again.";
			show_error(message, true);
		}
	});	
}