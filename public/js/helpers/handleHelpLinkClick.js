

/*
* handleHelpLinkClick
*/

function handleHelpLinkClick(){
    const helpText = `
    <div style=" text-align: left; line-height: 1.6;">
    1.) Use \${term} for dynamic values. 
    <BR />
    2.) Auto-generate loops until max number. You can edit while it runs.
    <BR />
    3.) The double dollar sign like $\${term} keeps value constant. 
    <BR />
    4.) 'Mixup' shuffles your comma-separated clauses.
    <BR />
    5.) 'Multiplier' text is inserted between clauses.
    <BR />
    6.) Make your own quick arrays like \${["one", "two"]}.
    <BR />
    7.) 'Guidance' adjusts the AI randomness.
    <BR />
    8.) Add custom variables if you prefer. Swipe to remove.
    <BR />
    9.) Click the images to open full-screen view.
    <BR />
    10.) You can click on most text to copy it to clipboard.
    <BR />
<BR>

</div>`;

    Swal.fire({
        html: helpText,
        confirmButtonText: 'Cool',
        width: '720',
        title: "Power Prompt Tips"
      })
}