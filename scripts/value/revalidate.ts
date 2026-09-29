/** Called only after the data push succeeds. A failed hook must surface to the runner. */
export async function revalidatePublishedValue() {
 const url=process.env.VALUE_REVALIDATE_URL,secret=process.env.VALUE_REVALIDATE_SECRET;
 if(!url||!secret)return;
 const response=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${secret}`},signal:AbortSignal.timeout(30_000)});
 if(!response.ok)throw new Error(`Value data pushed, but site revalidation failed (${response.status})`);
}
