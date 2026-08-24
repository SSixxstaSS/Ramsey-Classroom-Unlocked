// Runs in the page's own JS context (MAIN world) at document_start,
// so it patches fetch and XHR BEFORE the page makes any calls.

const TARGET = "api/v3/course_content_items/";



function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
        const existing = document.querySelector(selector);
        if (existing) return resolve(existing);

        const observer = new MutationObserver(() => {
            const el = document.querySelector(selector);
            if (el) {
                observer.disconnect();
                resolve(el);
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });

        setTimeout(() => {
            observer.disconnect();
            reject(new Error(`Timeout waiting for ${selector}`));
        }, timeout);
    });
}


// --- fetch ---
const originalFetch = window.fetch;

let initialContent = null

window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args);
    const url = typeof args[0] === "string" ? args[0] : args[0]?.url ?? "";


    if (url.includes(TARGET)) {
        response
            .clone()
            .text()
            .then(async (body) => {
                const data = JSON.parse(body)

                if (!!data.course_content_item) {
                    console.log(data)
                    initialContent=data.course_content_item
                    return;
                }


                const assessment = data.assessment
                for (const q of assessment.questions) {
                    switch (q.question_type) {
                        case "fill_in_the_blank": {
                            const answer = q.answers[0]?.answer;
                            const answerInput = await waitForElement(`input[name="answers[${q.id}]"]`);
                            const answerInputContainer = answerInput.parentElement;


                            answerInputContainer.style.display = 'flex'
                            answerInputContainer.style.alignItems = "center"

                            // const eyeSrc = chrome.runtime.getURL('images/logo.png');


                            answerInputContainer.insertAdjacentHTML("beforeend", `
                            <div 
                                style="
                                    width:100%;
                                    height:50px;
                                    position:absolute;
                                    top:-5px;
                                    left:0;
                                    translate:0 0%;
                                    background-color:#474747;
                                    border-radius:5px;
                                    opacity:0;
                                    pointer-events:none;
                                    border:1px solid #FFF;
                                    display:flex;
                                    align-items:center;
                                    justify-content:center;
                                    overflow:hidden;
                                    cursor: pointer;
                                "
                                id="${q.id}"
                            >
                                <p style="color:#FFF; pointer-events: none">${answer}</p>
                            </div>
                        `);

                            const answerEl = document.getElementById(String(q.id))


                            answerEl.addEventListener("mousedown", (e) => {
                                e.preventDefault();
                            });

                            answerEl.addEventListener("click", () => {
                                answerInput.value = answer
                                answerInput.blur()
                            })

                            answerInput.addEventListener("focus", async () => {
                                const forInt = 20;
                                for (let i = 0; i < forInt; i++) {
                                    answerEl.style.opacity = String(i / forInt);
                                    answerEl.style.translate = `0 -${100 * (i / forInt)}%`;
                                    await new Promise(resolve => setTimeout(resolve, 0.1));
                                }
                                answerEl.style.pointerEvents = "auto";
                            });

                            answerInput.addEventListener("blur", async () => {
                                const forInt = 20;
                                for (let i = forInt; i >= 0; i--) {
                                    answerEl.style.opacity = String(i / forInt);
                                    answerEl.style.translate = `0 -${100 * (i / forInt)}%`;
                                    await new Promise(resolve => setTimeout(resolve, 0.1));
                                }
                                answerEl.style.pointerEvents = "none";
                            });

                            break;
                        }
                        case "short_answer" :{
                            const answerInput = document.querySelector(`input[name="answers[${q.id}]"]`)
                            const answerInputContainer = answerInput.parentElement
                            const answer = q.answers[0]?.answer;

                            answerInputContainer.style.display = 'flex'
                            answerInputContainer.style.alignItems = "center"
                            answerInputContainer.style.position = "relative"

                            answerInputContainer.insertAdjacentHTML("beforeend", `
                                <p style="color:rgba(0,0,0,0.47); position:absolute; left:5px; bottom:0; font-size:0.5em">${answer}</p>
                            `);

                            break;
                        }
                        case "essay" :{
                            const answerInput = document.querySelector(`textarea[name="answers[${q.id}]"]`)
                            const answerInputContainer = answerInput.parentElement
                            const answer = q.answers[0]?.answer;

                            answerInputContainer.style.display = 'flex'
                            answerInputContainer.style.alignItems = "center"
                            answerInputContainer.style.position = "relative"

                            answerInputContainer.insertAdjacentHTML("beforeend", `
                                <p style="color:rgba(0,0,0,0.47); position:absolute; left:5px; bottom:5px; padding-right:50px; font-size:0.5em">${answer}</p>
                            `);

                            break;
                        }
                        case "multiple_choice": {
                            try {

                                if (!initialContent) return
                                const content = initialContent.lms_content.shortcodes.find(c=>c.attributes.lms_id===assessment.lms_id)?.questions?.find(q2=>q2.lms_id===q.lms_id)
                                console.log(content)
                                if (!content) return;

                                const answerIds = content.answers.filter(q2=>q2.is_correct).map(item=>item.lms_id)
                                for (const aId of answerIds) {
                                    const answerItem = q.answers.find(a2=>a2.lms_id===aId)
                                    const answerInput = document.getElementById(`answer-${answerItem.id}`)
                                    const answerInputContainer = answerInput.parentElement

                                    answerInputContainer.insertAdjacentHTML("beforeend", `
                                        <div
                                            style="width:2px; height:100%; background:#91e5ac; border-radius: 100px; position: absolute; left:-20px; top:50%; translate:0 -50%"
                                        ></div>
                                    `);


                                    console.log(answerItem)
                                }
                            } catch (e) {
                                console.log(e)
                            }





                            break;
                        }
                    }
                }
            })
            .catch(() => {});
    }

    return response;
};
