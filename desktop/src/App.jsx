  import React, { useState } from 'react'
export default function App(){
  const [text,setText]=useState("123456789");
  const [name,setName]=useState("Dukaan Product");
  const generate = ()=>{
    setTimeout(()=>{ window.JsBarcode("#barcode", text, {format:"CODE128", width:2, height:100}); },100)
  }
  return(
    <div style={{padding:20}}>
      <h2>Barcode Generator - Same as Website</h2>
      <input value={name} onChange={e=>setName(e.target.value)} placeholder="Product Name" style={{padding:10,width:'300px',marginRight:10}}/>
      <input value={text} onChange={e=>setText(e.target.value)} placeholder="Barcode Number" style={{padding:10,width:'200px'}}/>
      <button onClick={generate} style={{padding:10,background:'#ff6b00',color:'white',border:'none',marginLeft:10,cursor:'pointer'}}>Generate</button>
      <div style={{marginTop:30,border:'1px dashed #ccc',padding:20,textAlign:'center',width:'300px'}}>
        <p><b>{name}</b></p>
        <svg id="barcode"></svg>
        <p>Price: ₹ 299</p>
      </div>
      <p style={{marginTop:20,color:'gray'}}>This is Dukaan Barcode Studio Desktop. Same brand as website.</p>
    </div>
  )
}
