

/*
* handleHelpLinkClick
*/

function handleHelpLinkClick(){
    const helpText = `
    <div style=" text-align: left; line-height: 1.6;">
   
1.) Use template literals like \${term} to load in a dynamic value.
<BR>

2.) You can make your own arrays too i.e. \${["one", "two"]}.
<BR>

3.) Use double-dollar signs like $\${term} for the same value every time.
<BR>

4.) Mixup shuffles your prompt's comma-separated clauses. 
<BR>

5.) Multiplier text is inserted between the clauses.

<BR>

6.) Hit convert to build the prompt first.

<BR>

7.) The guidance value sets the amount of AI imagination.

<BR>

8.) Add you own custom variables. Dblclick to delete. Click to insert.

<BR>

9.) Be respectful of the Dalle3 content policies. 
<BR>

10.) If you enjoy please throw in a few bucks. 
<BR>

</div>`;

    Swal.fire({
        html: helpText,
        confirmButtonText: 'Cool',
        width: '640',
        title: "Power Prompt Tips"
      })
}