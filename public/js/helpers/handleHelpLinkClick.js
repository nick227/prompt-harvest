

/*
* handleHelpLinkClick
*/

function handleHelpLinkClick(){
    const helpText = `
    <div style=" text-align: left; line-height: 1.6;">
    1.) Use \${term} for dynamic values.
    <BR />
    2.) Make arrays like \${["one", "two"]}.
    <BR />
    3.) $\${term} keeps value constant.
    <BR />
    4.) 'Mixup' shuffles comma-separated clauses.
    <BR />
    5.) 'Multiplier' inserts text between clauses.
    <BR />
    6.) Click 'convert' to build prompt.
    <BR />
    7.) 'Guidance' adjusts AI imagination.
    <BR />
    8.) Add custom variables. Swipe to remove.
    <BR />
    9.) Click image to browse.
    <BR />
    10.) Respect Dalle3 content policies.
    <BR />
<BR>

</div>`;

    Swal.fire({
        html: helpText,
        confirmButtonText: 'Cool',
        width: '640',
        title: "Power Prompt Tips"
      })
}