import { useState } from "react";
import { Listbox } from "@headlessui/react";
import { Check, ChevronDown } from "lucide-react";

const aspectRatios = ["16:9", "9:16", "4:3", "1:1"];

export default function CustomSelect({ value, onChange }) {
  const [selected, setSelected] = useState(value || aspectRatios[0]);

  const handleSelect = (option) => {
    setSelected(option);
    if (onChange) onChange(option);
  };

  return (
    <div className="relative w-full">
      <Listbox value={selected} onChange={handleSelect}>
        <div className="relative">
          <Listbox.Button className="w-full px-4 py-2 text-gray-800 bg-pink-100 border border-pink-300 rounded-lg flex justify-between items-center">
            {selected}
            <ChevronDown className="h-5 w-5 text-pink-600" />
          </Listbox.Button>
          <Listbox.Options className="absolute w-full mt-2 bg-white border border-pink-300 rounded-lg shadow-lg z-10">
            {aspectRatios.map((ratio) => (
              <Listbox.Option
                key={ratio}
                value={ratio}
                className={({ active }) =>
                  `px-4 py-2 cursor-pointer flex justify-between items-center ${
                    active ? "bg-pink-200" : "bg-white"
                  }`
                }
              >
                {({ selected }) => (
                  <>
                    {ratio}
                    {selected && <Check className="h-4 w-4 text-pink-600" />}
                  </>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </div>
      </Listbox>
    </div>
  );
}