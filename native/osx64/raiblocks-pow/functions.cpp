#include <nan.h>
#include <random>
#include <sstream>
#include "blake2/blake2.h"
#include "xorshift.hpp"

uint64_t iterations(uint8_t * bytes, int max_iterations) {
  uint64_t threshold = 0xffffffc000000000;
  uint64_t work;
  uint64_t output = 0;
  blake2b_state hash;
  blake2b_init (&hash, sizeof(output));
  std::xorshift1024star rng;

  const int range_from  = 0;
  const int range_to    = 32767;
  std::random_device                  rand_dev;
  std::mt19937                        generator(rand_dev());
  std::uniform_int_distribution<int>  distr(range_from, range_to);

  for(int j = 0; j < 16; j++)
    rng.s[j] = distr(generator);

  int n = 0;
  while(output < threshold) {
    if(max_iterations != 0 && ++n > max_iterations) return 0;
    work = rng.next ();
    blake2b_update (&hash, reinterpret_cast <uint8_t *> (&work), sizeof (work));
    blake2b_update (&hash, bytes, 32);
    blake2b_final (&hash, reinterpret_cast <uint8_t *> (&output), sizeof (output));
    blake2b_init (&hash, sizeof (output));
  }

  return work;
}

void Calculate(const Nan::FunctionCallbackInfo<v8::Value>& info) {
  if (info.Length() < 1 || !info[0]->IsString()) {
    Nan::ThrowTypeError("Must supply one string argument");
    return;
  }

  std::string hex = std::string(*v8::String::Utf8Value(info[0]->ToString()));
  uint8_t bytes[32];
  int j = 0;
  for (unsigned int i = 0; i < hex.length(); i += 2) {
    std::string byteString = hex.substr(i, 2);
    uint8_t byte = (uint8_t) strtol(byteString.c_str(), NULL, 16);
    bytes[j] = byte;
    j++;
  }
  uint64_t work = iterations(bytes, 0);
  std::ostringstream oss;
  oss << std::hex << work;
  std::string intAsString(oss.str());
  info.GetReturnValue().Set(Nan::New(intAsString).ToLocalChecked());
}


class PowAsyncWorker : public Nan::AsyncWorker {
public:
  std::string hex;
  std::string workValue;

  PowAsyncWorker(std::string hex, Nan::Callback *callback)
    : Nan::AsyncWorker(callback) {

    this->hex = hex;
    this->workValue = "";
  }

  void Execute() {
    uint8_t bytes[32];
    int j = 0;
    for (unsigned int i = 0; i < hex.length(); i += 2) {
      std::string byteString = hex.substr(i, 2);
      uint8_t byte = (uint8_t) strtol(byteString.c_str(), NULL, 16);
      bytes[j] = byte;
      j++;
    }
    uint64_t work = iterations(bytes, 10000000);
    std::ostringstream oss;
    oss << std::hex << work;
    workValue = oss.str();
  }

  void HandleOKCallback() {
    Nan::HandleScope scope;
    v8::Local<v8::Value> argv[] = {
      Nan::Null(), // no error occured
      Nan::New(workValue).ToLocalChecked()
    };
    callback->Call(2, argv);
  }

  void HandleErrorCallback() {
    Nan::HandleScope scope;
    v8::Local<v8::Value> argv[] = {
      Nan::New(this->ErrorMessage()).ToLocalChecked(), // return error message
      Nan::Null()
    };
    callback->Call(2, argv);
  }
};

void CalculateAsync(const Nan::FunctionCallbackInfo<v8::Value>& info) {
  if (info.Length() < 2 || !info[0]->IsString() || !info[1]->IsFunction()) {
    Nan::ThrowTypeError("Must supply a string and a callback");
    return;
  }
  std::string hex = std::string(*v8::String::Utf8Value(info[0]->ToString()));
  Nan::AsyncQueueWorker(new PowAsyncWorker(hex, new Nan::Callback(info[1].As<v8::Function>())));
}

void Init(v8::Local<v8::Object> exports) {
  exports->Set(Nan::New("calculate").ToLocalChecked(),
               Nan::New<v8::FunctionTemplate>(Calculate)->GetFunction());
  exports->Set(Nan::New("calculateAsync").ToLocalChecked(),
               Nan::New<v8::FunctionTemplate>(CalculateAsync)->GetFunction());
}

NODE_MODULE(functions, Init)
