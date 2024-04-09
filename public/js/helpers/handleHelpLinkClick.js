

/*
handleHelpLinkClick
*/

function handleHelpLinkClick(){
    const helpText = `
    <div style=" text-align: left; line-height: 1.6;">
    Use \${term} for dynamic values. 
    <BR />
    $\${term} keeps value constant. 
    <BR />
    'Mixup' shuffles your clauses.
    <BR />
    'Multiplier' inserts between clauses.
    <BR />
    Custom arrays: \${["one", "two"]}.
    <BR />
    'Guidance' adjusts the AI randomness.
    <BR />
    Click images to open full-screen.
    <BR />
    Click text to copy it to clipboard.
    <BR />
    Logging in keeps your images private.
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