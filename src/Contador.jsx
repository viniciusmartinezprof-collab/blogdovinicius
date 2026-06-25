import { useState } from "react";
import { Plus,Camera } from "lucide-react"


function Contador() {

  const [count, setCount] = useState(0);
  return (
    <div>
        <button onClick={() => setCount(count + 1)}><Plus/></button>
        <span>{count}</span>
        <button onClick={() => setCount(count - 1)}><Camera/></button>
    </div>
  );
}

export default Contador;